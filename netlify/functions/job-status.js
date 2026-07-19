// ============================================================
// GET /.netlify/functions/job-status?id=<request_id>
// Auth required. Checks a pending job once: returns processing / completed
// (with the URL, and records the generation) / failed (and refunds credits).
// The browser calls this every few seconds until done.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { pollAny, synthesizeResemble, triggerTextWorker } = require('./_providers');
const { cropToAspect, createCanvas, loadImage, pasteFeathered } = require('./_canvas');
// Deliberately from _speech-batch.js, NOT _avatar-video.js -- this function
// is the single most frequently invoked one in the whole app (every job
// polls it every few seconds), and _avatar-video.js pulls in ffprobe (via
// probeDuration) that this file never actually needs; every extra native
// binary a function's dependency graph touches gets its own full copy
// bundled in (Netlify doesn't dedupe these across functions), so keeping
// this specific import graph minimal has an outsized effect on total
// deploy size. See _speech-batch.js's header.
const { splitScript, RESEMBLE_BATCH_CHARS } = require('./_speech-batch');
const { ensureWorkDir, cleanupTmp, concatAudio, uploadToStorage, downloadToFile, ffmpeg } = require('./_ffmpeg');
const { muapiHostFile } = require('./_muapi');
const { extractErrorMessage } = require('./_errors');
const fs = require('fs').promises;
const path = require('path');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MUAPI_SUB_SEP = '::sub::';
const ASPECT_RATIO = { '1:1': 1, '9:16': 9 / 16, '4:5': 4 / 5, '3:4': 3 / 4, '16:9': 16 / 9 };

// GPT Image 2 only has 3 fixed native sizes, so an aspect like 4:5 comes back
// as the closest one (2:3 portrait) instead — center-crop it down to the
// exact ratio the user picked and re-host the result. Falls back to the
// original url on any failure (network blip, decode error) so a display
// hiccup here never blocks the job from completing.
async function fixFlyerAspect(db, userId, url, aspectKey) {
  const ratio = ASPECT_RATIO[aspectKey];
  if (!ratio) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) return url;
    const buf = Buffer.from(await res.arrayBuffer());
    const cropped = await cropToAspect(buf, ratio);
    if (cropped === buf) return url; // already matched, no re-encode happened
    const storagePath = `${userId}/flyer-crop-${Date.now()}.png`;
    const { error } = await db.storage.from('avatars').upload(storagePath, cropped, { contentType: 'image/png', upsert: true });
    if (error) return url;
    return db.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
  } catch (e) { return url; }
}

function extractText(p) {
  if (!p) return '';
  if (typeof p.output === 'string') return p.output;
  if (typeof p.text === 'string') return p.text;
  if (typeof p.result === 'string') return p.result;
  if (Array.isArray(p.outputs) && p.outputs.length) return String(p.outputs[0]);
  if (p.choices && p.choices[0] && p.choices[0].message) return p.choices[0].message.content;
  if (p.output && typeof p.output === 'object') return p.output.text || '';
  return '';
}
exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Missing id' });

  const db = admin();
  const { data: job } = await db.from('jobs').select('*').eq('request_id', id).maybeSingle();
  if (!job || job.user_id !== user.id) return json(404, { error: 'Job not found' });

  if (job.kind === 'video-transcribe') return handleTranscribeJob(db, user, job, id);

  const isTextKind = job.kind === 'chat' || job.kind === 'flyer-brief' || job.kind === 'video-edit-brief' || job.kind === 'flyer-suggest-layers';
  if (job.status === 'completed') {
    return isTextKind ? json(200, { status: 'completed', text: job.output_text }) : json(200, { status: 'completed', url: job.output_url });
  }
  if (job.status === 'failed') return json(200, isTextKind && job.output_text ? { status: 'failed', error: job.output_text } : { status: 'failed' });

  // Resemble voice jobs never got a real external request_id at submit time
  // (audio-generate.js only inserted a pending row) — the actual synth +
  // storage upload happens right here, lazily, on this first poll. Doing it
  // here instead of during the original POST keeps that initial request
  // fast and keeps this specific poll's own risk of running long isolated
  // to a single retry-able poll cycle (the browser just asks again in 6s)
  // rather than crashing the user-facing submit call with a raw timeout.
  if (job.kind === 'audio' && job.model && job.model.indexOf('resemble:') === 0) {
    // Atomically claim the job before doing the real (slow) work below —
    // setInterval on the frontend fires every few seconds regardless of
    // whether the PREVIOUS poll's fetch has resolved yet, so if synthesis
    // takes longer than one poll interval, multiple overlapping polls would
    // otherwise all see status:'processing' and all kick off their own
    // synth run for the same job (real duplicate Resemble cost, not just a
    // display glitch). Only the poll that successfully flips
    // 'processing' -> 'generating' proceeds; every other concurrent poll
    // sees the claim fail and just reports "still processing".
    const { data: claimed } = await db.from('jobs').update({ status: 'generating' }).eq('request_id', id).eq('status', 'processing').select().maybeSingle();
    if (!claimed) return json(200, { status: 'processing' });
    const voiceUuid = job.model.slice('resemble:'.length);
    const jobWorkId = 'resemble-' + id;
    try {
      // Confirmed live 2026-07-17: Resemble's sync /synthesize is unreliable
      // past a few hundred characters in one call — a ~270-word single call
      // came back an outright 504, and a real ~300-word script that DID
      // return audio had words dropped/substituted throughout, not just at
      // one spot. Same fix as the Avatar Creator's long-form path: split at
      // sentence boundaries, synthesize each small piece in parallel (fast,
      // confirmed clean at this size), then stitch into one continuous track.
      const chunks = splitScript(job.prompt, RESEMBLE_BATCH_CHARS);
      const dir = await ensureWorkDir(jobWorkId);
      const localPaths = await Promise.all(chunks.map(async (chunkText, i) => {
        const { base64, format } = await synthesizeResemble({ text: chunkText, voiceUuid });
        const localPath = path.join(dir, `resemble-chunk-${i}.${format}`);
        await fs.writeFile(localPath, Buffer.from(base64, 'base64'));
        return localPath;
      }));
      const joined = path.join(dir, 'resemble-joined.m4a');
      await concatAudio(localPaths, joined, jobWorkId);
      const storagePath = `${user.id}/resemble-${Date.now()}.m4a`;
      const url = await uploadToStorage(db, joined, storagePath, 'audio/mp4');
      await cleanupTmp(jobWorkId);
      await db.from('jobs').update({ status: 'completed', output_url: url }).eq('request_id', id);
      try { await db.from('generations').insert({ user_id: user.id, type: 'audio', model: 'resemble', prompt: job.prompt, output_url: url, credits_spent: job.credits }); } catch (e) {}
      return json(200, { status: 'completed', url });
    } catch (e) {
      try { await cleanupTmp(jobWorkId); } catch (_) {}
      // A single failed attempt (network blip, cold start) shouldn't burn
      // the user's credits or dead-end the job — leave it 'processing' so
      // the next poll just tries again. But an unbounded retry would loop
      // forever showing "processing" if the failure is real (bad voice
      // uuid, Resemble account issue) rather than transient — give it
      // ~90s of retries (the global poller fires every 6s) before giving
      // up for good and refunding, same as a genuine provider failure would.
      const ageMs = Date.now() - new Date(job.created_at).getTime();
      if (ageMs > 90000) {
        await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
        await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
        return json(200, { status: 'failed', error: (e && e.message) || 'Resemble synthesis failed.' });
      }
      // Hand the claim back so the NEXT poll can retry — leaving it stuck
      // at 'generating' would mean nothing ever matches the claim's
      // .eq('status','processing') again, permanently wedging the job.
      await db.from('jobs').update({ status: 'processing' }).eq('request_id', id);
      return json(200, { status: 'processing' });
    }
  }

  // Chat jobs (Fuse Reactor) and Flyer Studio's/Editing Studio's design-
  // assistant calls never got a real external request_id at submit time
  // (each of those functions only inserts a pending row now) — the actual
  // WaveSpeed LLM call happens right here, lazily, on this first poll.
  // Same reasoning as the Resemble audio branch above: a rich reply can
  // genuinely take longer than Netlify's own function timeout, so doing it
  // during the original POST risked an HTML timeout page crashing the
  // frontend's response.json() ("Unexpected token '<'") — confirmed live
  // 2026-07-17 on Flyer Studio's brief chat right after this moved off
  // MuAPI. Isolating it to a single retry-able poll cycle instead means a
  // slow reply just costs one more 6s wait, not a hard failure.
  if (isTextKind) {
    // The actual WaveSpeed call now runs in text-job-worker-background.js,
    // a real Netlify Background Function (15-minute budget) triggered
    // fire-and-forget by whichever endpoint inserted this job -- doing it
    // inline HERE (the old design) meant a slow vision call got killed
    // mid-flight by this function's own short execution window, leaving
    // the job stuck at 'generating' forever with no retry, no failure, no
    // refund. This poll is now a pure read of whatever that worker
    // eventually writes.
    if (job.status === 'processing') {
      // Safety net: if the worker was never actually triggered (the
      // original endpoint's own trigger fetch failed) or is slow to start,
      // re-fire it after a few seconds. The worker's own atomic claim
      // makes this idempotent -- re-triggering a job someone else already
      // claimed just no-ops.
      const ageMs = Date.now() - new Date(job.created_at).getTime();
      if (ageMs > 6000) triggerTextWorker(id);
    }
    return json(200, { status: 'processing' });
  }

  // Video / avatar / modelsheet: pollAny routes by the request_id prefix
  // ("ws:" -> WaveSpeed, bare -> MuAPI) so mixed-provider jobs just work.
  let r;
  try { r = await pollAny(id); } catch (e) { return json(200, { status: 'processing' }); }

  if (r.status === 'completed') {
    let url = r.url;
    if (!url) return json(200, { status: 'processing' });
    if ((job.kind === 'flyer-hero' || job.kind === 'flyer-composite') && job.aspect) url = await fixFlyerAspect(db, user.id, url, job.aspect);
    await db.from('jobs').update({ status: 'completed', output_url: url }).eq('request_id', id);
    // A model sheet isn't a normal gallery item — save it onto the avatar so all
    // future generations use it as the consistent reference. The avatar id is
    // carried in the prompt as "MODELSHEET::<id>" (or in the avatar_id column).
    if (job.kind === 'modelsheet') {
      const avId = job.avatar_id || (job.prompt && job.prompt.indexOf('MODELSHEET::') === 0 ? job.prompt.slice(12) : null);
      if (avId) { try { await db.from('avatars').update({ model_sheet_url: url }).eq('id', avId); } catch (e) {} }
      return json(200, { status: 'completed', url, kind: 'modelsheet' });
    }
    // Flyer Studio's hero/layer visuals are working images inside an
    // in-progress project, so they still get saved onto the project itself
    // (flyer-layer also appends to the project's layer history) — but they
    // ARE also real generations the user made and should be able to find
    // again, so they go into `generations` too now (the Projects tab reads
    // only from that table, and flyer visuals were invisible there before).
    if (job.kind === 'flyer-hero' || job.kind === 'flyer-layer') {
      if (job.project_id) {
        try {
          const { data: proj } = await db.from('flyer_projects').select('layers, credits').eq('id', job.project_id).maybeSingle();
          const update = { hero_image_url: url, updated_at: new Date().toISOString(), credits: (proj && proj.credits || 0) + job.credits };
          if (job.kind === 'flyer-hero') update.hero_prompt = job.prompt;
          if (job.kind === 'flyer-layer') {
            const layers = (proj && Array.isArray(proj.layers)) ? proj.layers : [];
            layers.push({ instruction: job.prompt, image_url: url, created_at: new Date().toISOString() });
            update.layers = layers;
          }
          await db.from('flyer_projects').update(update).eq('id', job.project_id);
        } catch (e) {}
      }
      try {
        await db.from('generations').insert({
          user_id: user.id, type: 'image', model: job.model, prompt: job.prompt, aspect: job.aspect,
          output_url: url, credits_spent: job.credits, cost_usd: r.cost_usd,
        });
      } catch (e) {}
      return json(200, { status: 'completed', url, kind: job.kind, project_id: job.project_id });
    }
    // Final composited flyer — GPT Image 2 rendering the typography itself
    // now (switched 2026-07-16), so this is a real paid async job like
    // hero/layer, not a synchronous free render anymore.
    if (job.kind === 'flyer-composite') {
      if (job.project_id) {
        try {
          const { data: proj } = await db.from('flyer_projects').select('credits').eq('id', job.project_id).maybeSingle();
          await db.from('flyer_projects').update({ final_url: url, updated_at: new Date().toISOString(), credits: (proj && proj.credits || 0) + job.credits }).eq('id', job.project_id);
        } catch (e) {}
      }
      try {
        await db.from('generations').insert({
          user_id: user.id, type: 'image', model: job.model, prompt: job.prompt, aspect: job.aspect,
          output_url: url, credits_spent: job.credits, cost_usd: r.cost_usd,
        });
      } catch (e) {}
      return json(200, { status: 'completed', url, kind: job.kind, project_id: job.project_id });
    }
    // Flyer Studio "spot fix" — the edited crop `url` is just the small
    // marked region on its own; paste it back into the original full flyer
    // at the exact pixel position media-pipeline.js recorded in job.meta,
    // feathered at the edges so there's no visible seam, then that becomes
    // the project's new final_url. See _canvas.js's pasteFeathered.
    if (job.kind === 'flyer-spot-fix') {
      const meta = job.meta || {};
      if (!meta.original_url) return json(200, { status: 'failed', error: 'Missing crop position — try the fix again.' });
      try {
        const [origRes, editedRes] = await Promise.all([fetch(meta.original_url), fetch(url)]);
        const [origBuf, editedBuf] = await Promise.all([origRes.arrayBuffer(), editedRes.arrayBuffer()]);
        const origImg = await loadImage(Buffer.from(origBuf));
        const editedImg = await loadImage(Buffer.from(editedBuf));
        const canvas = createCanvas(origImg.width, origImg.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(origImg, 0, 0);
        pasteFeathered(ctx, editedImg, meta.x, meta.y, meta.w, meta.h);
        const finalBuf = canvas.toBuffer('image/png');
        const storagePath = `${user.id}/spotfix-${job.project_id}-${Date.now()}.png`;
        const { error: upErr } = await db.storage.from('avatars').upload(storagePath, finalBuf, { contentType: 'image/png', upsert: true });
        if (upErr) throw new Error(upErr.message);
        const finalUrl = db.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
        if (job.project_id) {
          try {
            const { data: proj } = await db.from('flyer_projects').select('credits').eq('id', job.project_id).maybeSingle();
            await db.from('flyer_projects').update({ final_url: finalUrl, updated_at: new Date().toISOString(), credits: (proj && proj.credits || 0) + job.credits }).eq('id', job.project_id);
          } catch (e) {}
        }
        try {
          await db.from('generations').insert({
            user_id: user.id, type: 'image', model: job.model, prompt: job.prompt, aspect: job.aspect,
            output_url: finalUrl, credits_spent: job.credits, cost_usd: r.cost_usd,
          });
        } catch (e) {}
        await db.from('jobs').update({ status: 'completed', output_url: finalUrl }).eq('request_id', id);
        return json(200, { status: 'completed', url: finalUrl, kind: job.kind, project_id: job.project_id });
      } catch (e) {
        await db.from('jobs').update({ status: 'failed', error_message: e.message }).eq('request_id', id);
        try { await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' }); } catch (_) {}
        return json(200, { status: 'failed', error: e.message || 'Could not paste the fix back in.' });
      }
    }
    // AI Auto-Edit (Gemini Omni) result — same "current working video"
    // pointer every Editing Studio step reads/writes.
    if (job.kind === 'video-omni-edit') {
      if (job.project_id) { try { await db.from('video_edit_projects').update({ final_video_url: url, updated_at: new Date().toISOString() }).eq('id', job.project_id); } catch (e) {} }
      return json(200, { status: 'completed', url, kind: job.kind, project_id: job.project_id });
    }
    // Lipsync resync pass result — saved onto resynced_url, alongside the
    // ORIGINAL output_url (never overwritten), so both are still there to
    // compare.
    if (job.kind === 'avatar-video-resync') {
      if (job.project_id) { try { await db.from('avatar_videos').update({ resynced_url: url, updated_at: new Date().toISOString() }).eq('id', job.project_id); } catch (e) {} }
      return json(200, { status: 'completed', url, kind: job.kind, project_id: job.project_id });
    }
    await db.from('generations').insert({
      user_id: user.id, type: job.kind, model: job.model, prompt: job.prompt, aspect: job.aspect,
      output_url: url, credits_spent: job.credits, cost_usd: r.cost_usd,
    });
    return json(200, { status: 'completed', url });
  }
  if (r.status === 'failed') {
    await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
    await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
    // Surface the engine's own reason when it gave one — a bare "Generation
    // failed" is undiagnosable when it happens again; the provider's raw
    // prediction usually carries the real reason under one of these keys.
    const raw = r.raw || {};
    const reason = raw.error || raw.detail || raw.logs || raw.message || null;
    return json(200, { status: 'failed', error: reason ? `Generation failed: ${String(reason).slice(0, 200)}` : 'Generation failed' });
  }
  return json(200, { status: 'processing' });
};

// Whisper's completed payload isn't a media URL like every other job kind —
// it's a text/JSON transcript. Parsed defensively since the exact shape
// (plain string vs. an object with words/segments) wasn't confirmed via a
// live completed example in this sandbox (every public test audio URL
// tried got blocked before reaching the transcription step) — this matches
// the standard OpenAI Whisper verbose_json shape, with graceful fallbacks.
function parseTranscript(raw) {
  let val = raw;
  if (typeof val === 'string') { try { val = JSON.parse(val); } catch (e) { return { text: raw }; } }
  if (val && typeof val === 'object') {
    if (Array.isArray(val.words) || Array.isArray(val.segments) || typeof val.text === 'string') return val;
  }
  return { text: String(raw) };
}

async function handleTranscribeJob(db, user, job, id) {
  if (job.status === 'completed') return json(200, { status: 'completed', transcript: job.output_text ? JSON.parse(job.output_text) : null, project_id: job.project_id });
  if (job.status === 'failed') return json(200, { status: 'failed' });

  const sepIdx = (job.model || '').indexOf(MUAPI_SUB_SEP);
  if (sepIdx === -1) {
    // Not submitted to MuAPI yet — this is the first poll. Claim atomically
    // (overlapping polls fire every 5s regardless of whether the previous
    // tick's fetch resolved) so only one poll ever downloads+processes the
    // source video and submits it — everyone else just reports "processing".
    const { data: claimed } = await db.from('jobs').update({ status: 'generating' }).eq('request_id', id).eq('status', 'processing').select().maybeSingle();
    if (!claimed) return json(200, { status: 'processing' });
    const jobWorkId = 'transcribe-' + id.replace(/[^a-zA-Z0-9]/g, '');
    try {
      const dir = await ensureWorkDir(jobWorkId);
      const localVideo = path.join(dir, 'in.mp4');
      await downloadToFile(job.prompt, localVideo);
      const audioPath = path.join(dir, 'audio.mp3');
      await ffmpeg(['-y', '-i', localVideo, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', audioPath]);
      const audioUrl = await uploadToStorage(db, audioPath, `${user.id}/transcribe-${Date.now()}.mp3`, 'audio/mpeg');
      // Re-host on MuAPI's own CDN — Supabase storage URLs aren't always
      // reachable by MuAPI directly (see _muapi.js).
      const hostedAudioUrl = await muapiHostFile(audioUrl, 'audio');
      await cleanupTmp(jobWorkId);

      const sub = await fetch(`${MUAPI_BASE}/${job.model}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ audio_url: hostedAudioUrl, response_format: 'verbose_json', timestamp_granularities: ['word'] }),
      });
      const txt = await sub.text();
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
      if (!sub.ok) throw new Error(extractErrorMessage(j) || ('Engine HTTP ' + sub.status));
      const muapiId = j.request_id || j.id;
      if (!muapiId) throw new Error('Engine did not start the job');

      // Stash the real MuAPI prediction id onto the model column (our own
      // request_id stays the frontend's stable polling key) so the NEXT
      // poll knows to check MuAPI's result instead of re-submitting.
      await db.from('jobs').update({ status: 'processing', model: job.model + MUAPI_SUB_SEP + muapiId }).eq('request_id', id);
      return json(200, { status: 'processing' });
    } catch (e) {
      try { await cleanupTmp(jobWorkId); } catch (_) {}
      const ageMs = Date.now() - new Date(job.created_at).getTime();
      if (ageMs > 90000) {
        await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
        await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
        return json(200, { status: 'failed', error: (e && e.message) || 'Transcription failed' });
      }
      await db.from('jobs').update({ status: 'processing' }).eq('request_id', id);
      return json(200, { status: 'processing' });
    }
  }

  const muapiId = job.model.slice(sepIdx + MUAPI_SUB_SEP.length);
  let p;
  try {
    p = await (await fetch(`${MUAPI_BASE}/predictions/${muapiId}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
  } catch (e) { return json(200, { status: 'processing' }); }
  if (p.status === 'completed') {
    const raw = extractText(p) || (p.output && typeof p.output === 'object' ? p.output : null);
    if (!raw) return json(200, { status: 'processing' });
    const transcript = parseTranscript(raw);
    await db.from('jobs').update({ status: 'completed', output_text: JSON.stringify(transcript) }).eq('request_id', id);
    if (job.project_id) { try { await db.from('video_edit_projects').update({ transcript, updated_at: new Date().toISOString() }).eq('id', job.project_id); } catch (e) {} }
    return json(200, { status: 'completed', transcript, project_id: job.project_id });
  }
  if (p.status === 'failed' || p.status === 'cancelled') {
    await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
    await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
    return json(200, { status: 'failed', error: 'Transcription ' + p.status });
  }
  return json(200, { status: 'processing' });
}
