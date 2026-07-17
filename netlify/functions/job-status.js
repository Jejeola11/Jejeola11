// ============================================================
// GET /.netlify/functions/job-status?id=<request_id>
// Auth required. Checks a pending job once: returns processing / completed
// (with the URL, and records the generation) / failed (and refunds credits).
// The browser calls this every few seconds until done.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { pollAny, synthesizeResemble } = require('./_providers');
const { cropToAspect } = require('./_canvas');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
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
  if (job.status === 'failed') return json(200, { status: 'failed' });

  // Resemble voice jobs never got a real external request_id at submit time
  // (audio-generate.js only inserted a pending row) — the actual synth +
  // storage upload happens right here, lazily, on this first poll. Doing it
  // here instead of during the original POST keeps that initial request
  // fast and keeps this specific poll's own risk of running long isolated
  // to a single retry-able poll cycle (the browser just asks again in 6s)
  // rather than crashing the user-facing submit call with a raw timeout.
  if (job.kind === 'audio' && job.model && job.model.indexOf('resemble:') === 0) {
    const voiceUuid = job.model.slice('resemble:'.length);
    try {
      const { base64, format } = await synthesizeResemble({ text: job.prompt, voiceUuid });
      const buf = Buffer.from(base64, 'base64');
      const path = `${user.id}/resemble-${Date.now()}.${format}`;
      const { error: upErr } = await db.storage.from('avatars').upload(path, buf, { contentType: `audio/${format}`, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
      await db.from('jobs').update({ status: 'completed', output_url: url }).eq('request_id', id);
      try { await db.from('generations').insert({ user_id: user.id, type: 'audio', model: 'resemble', prompt: job.prompt, output_url: url, credits_spent: job.credits }); } catch (e) {}
      return json(200, { status: 'completed', url });
    } catch (e) {
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
      return json(200, { status: 'processing' });
    }
  }

  // Chat jobs (Fuse Reactor) and Flyer Studio's design-assistant calls are
  // always MuAPI text models — poll directly for the raw body extractText()
  // needs. flyer-brief/video-edit-brief responses are plain tagged text
  // (<REPLY>...</REPLY> etc.) — the browser regex-extracts each tag.
  if (isTextKind) {
    let p;
    try {
      p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
    } catch (e) { return json(200, { status: 'processing' }); }
    if (p.status === 'completed') {
      const text = extractText(p);
      if (!text) return json(200, { status: 'processing' });
      await db.from('jobs').update({ status: 'completed', output_text: text }).eq('request_id', id);
      return json(200, { status: 'completed', text });
    }
    if (p.status === 'failed' || p.status === 'cancelled') {
      await db.rpc('add_credits', { uid: user.id, amount: job.credits, why: 'refund' });
      await db.from('jobs').update({ status: 'failed' }).eq('request_id', id);
      return json(200, { status: 'failed', error: 'AI ' + p.status });
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
    // AI Auto-Edit (Gemini Omni) result — same "current working video"
    // pointer every Editing Studio step reads/writes.
    if (job.kind === 'video-omni-edit') {
      if (job.project_id) { try { await db.from('video_edit_projects').update({ final_video_url: url, updated_at: new Date().toISOString() }).eq('id', job.project_id); } catch (e) {} }
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

  let p;
  try {
    p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
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
