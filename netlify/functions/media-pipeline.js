// ============================================================
// /.netlify/functions/media-pipeline
// GET  ?id=<avatar_video_id>                       — avatar pipeline status poll
// POST { action:'train'  | 'create', ... }         — AI Avatar Creator (see avatar-media.js's old header)
// POST { type:'caption' | 'cta' | 'element', ... }  — Video Editing Studio overlays (see video-overlay.js's old header)
// POST { op:'flyer-spot-fix', project_id, region, instruction } — Flyer Studio spot fix (see flyer-spot-fix.js's old header)
//
// Merged from three already-merged functions (avatar-media.js,
// video-overlay.js, and flyer-spot-fix.js) because Netlify kept running out
// of build disk space even after the first two merges got the shared total
// down to ~274MB (job-status.js 99MB + this function's own 175MB) — adding
// flyer-spot-fix.js as its OWN function shipped a third, fully duplicate
// ~33MB canvas bundle on top of that (307MB total), which was enough to
// tip every subsequent build back into ENOSPC, including two commits after
// it that touched no backend code at all (same root cause, inherited).
// canvas is already part of this function's bundle (video-overlay needs
// it) -- folding flyer-spot-fix's logic in here costs nothing extra and
// removes that whole duplicate copy, back down to ~274MB total.
// `action`, `type`, and `op` never collide (existing call sites always
// send exactly one of the three), so no separate top-level domain field is
// needed to route between them.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { avatarVideoCredits, estimateScriptMinutes, IMAGE_MODELS, canUseFree } = require('./_packs');
const { advance } = require('./_avatar-video');
const {
  ensureWorkDir, cleanupTmp, downloadToFile, extractFrameAt, uploadToStorage,
  overlayImageOnVideo, overlayImageAtTime, overlayTimedImages, probeDimensions,
} = require('./_ffmpeg');
const { createCanvas, loadImage, drawCtaBanner } = require('./_canvas');
const { chunkWords, extractWords, renderCaptionCard } = require('./_captions');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');
const path = require('path');
const fs = require('fs/promises');

// ---------------- Avatar: status / train / create ----------------

async function handleAvatarStatus(event, user) {
  const id = (event.queryStringParameters || {}).id;
  if (!id) return json(400, { error: 'Missing id' });

  const db = admin();
  const { data: video } = await db.from('avatar_videos').select('id, user_id, stage, output_url, error_message').eq('id', id).maybeSingle();
  if (!video || video.user_id !== user.id) return json(404, { error: 'Not found' });

  if (video.stage === 'complete') return json(200, { stage: 'complete', url: video.output_url });
  if (video.stage === 'failed') return json(200, { stage: 'failed', error: video.error_message || 'Generation failed.' });

  try {
    const progress = await advance(db, id);
    return json(200, progress);
  } catch (e) {
    return json(200, { stage: video.stage, progress: 'working…' });
  }
}

async function handleAvatarTrain(user, body) {
  const avatarId = body.avatar_id;
  const sourceVideoUrl = (body.source_video_url || '').trim();
  const voiceSampleUrl = (body.voice_sample_url || '').trim();
  const voiceReferenceText = (body.voice_reference_text || '').trim();
  const ttsEngine = body.tts_engine === 'resemble' ? 'resemble' : null;
  const resembleVoiceUuid = (body.resemble_voice_uuid || '').trim();
  const removePhotoUrl = (body.remove_photo_url || '').trim();
  if (!avatarId) return json(400, { error: 'Missing avatar_id' });
  if (!sourceVideoUrl && !voiceSampleUrl && !ttsEngine && !removePhotoUrl) return json(400, { error: 'Nothing to train.' });

  const db = admin();
  const { data: avatar } = await db.from('avatars').select('id, user_id, image_url, image_urls').eq('id', avatarId).maybeSingle();
  if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });

  const update = {};

  if (removePhotoUrl) {
    const current = Array.isArray(avatar.image_urls) ? avatar.image_urls : [];
    const remaining = current.filter((u) => u !== removePhotoUrl);
    if (!remaining.length) return json(400, { error: 'An avatar needs at least one training photo.' });
    update.image_urls = remaining;
    // The primary image_url is what every generation grounds against
    // first — if the photo being removed was that one, promote whatever
    // is left so nothing points at a deleted photo.
    if (avatar.image_url === removePhotoUrl) update.image_url = remaining[0];
  }
  if (voiceSampleUrl) { update.voice_sample_url = voiceSampleUrl; update.voice_status = 'ready'; update.voice_reference_text = voiceReferenceText || null; }
  if (ttsEngine === 'resemble' && resembleVoiceUuid) { update.tts_engine = 'resemble'; update.resemble_voice_uuid = resembleVoiceUuid; update.voice_status = 'ready'; }
  else if (body.tts_engine === 'wavespeed') { update.tts_engine = 'wavespeed'; }

  if (sourceVideoUrl) {
    const jobId = 'train-' + avatarId + '-' + Date.now();
    try {
      const dir = await ensureWorkDir(jobId);
      const localVideo = path.join(dir, 'source.mp4');
      await downloadToFile(sourceVideoUrl, localVideo);
      const framePath = path.join(dir, 'master-frame.png');
      // 1s in — past any initial hand-off/blink, before the camera person moves.
      await extractFrameAt(localVideo, 1, framePath);
      const frameUrl = await uploadToStorage(db, framePath, `${user.id}/av-trained-${avatarId}-${Date.now()}.png`, 'image/png');
      update.source_video_url = sourceVideoUrl;
      update.trained_frame_url = frameUrl;
    } finally {
      await cleanupTmp(jobId);
    }
  }

  const { error } = await db.from('avatars').update(update).eq('id', avatarId);
  if (error) throw new Error(error.message);
  return json(200, { ok: true, ...update });
}

async function handleAvatarCreate(user, body) {
  let db, cost = 0;
  try {
    if (!process.env.WAVESPEED_KEY) return json(503, { error: 'Avatar Creator is being connected (WAVESPEED_KEY missing).' });

    const avatarId = body.avatar_id;
    const script = (body.script || '').trim();
    const mode = body.mode === 'motion' ? 'motion' : 'talking';
    const cameraMotion = (body.camera_motion || '').trim();
    const audioUrl = (body.audio_url || '').trim();
    const settings = (body.settings && typeof body.settings === 'object') ? body.settings : {};
    if (!avatarId) return json(400, { error: 'Missing avatar_id' });
    if (!script) return json(400, { error: 'Write (or paste) the script first.' });
    if (mode === 'motion' && !cameraMotion) return json(400, { error: 'Describe the camera motion / action for a motion video.' });

    db = admin();
    const { data: avatar } = await db.from('avatars').select('*').eq('id', avatarId).maybeSingle();
    if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });
    const hasResembleVoice = avatar.tts_engine === 'resemble' && avatar.resemble_voice_uuid;
    if (!audioUrl && !avatar.voice_sample_url && !hasResembleVoice) return json(400, { error: 'Upload a voice sample, attach your own pre-made audio, or pick a Resemble voice, first.' });
    const masterFrame = settings.start_image || avatar.trained_frame_url || avatar.model_sheet_url || avatar.image_url;
    if (!masterFrame) return json(400, { error: 'This avatar has no reference photo yet.' });

    const minutes = estimateScriptMinutes(script);
    cost = avatarVideoCredits(minutes, !audioUrl, mode, settings.resolution || '480p');

    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const { data: video, error: insErr } = await db.from('avatar_videos').insert({
      user_id: user.id, avatar_id: avatarId, script, settings, credits: cost, stage: 'speech',
      mode, camera_motion: cameraMotion || null, uploaded_audio_url: audioUrl || null,
    }).select().single();
    if (insErr) throw new Error(insErr.message);

    const progress = await advance(db, video.id);
    return json(200, { id: video.id, credits: balance, estimated_minutes: Math.round(minutes * 10) / 10, ...progress });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start the video', refunded: cost });
  }
}

// ---------------- Video Editing Studio overlays: caption / cta / element ----------------

async function handleOverlay(user, body) {
  const jobId = 'ovl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    const type = body.type;
    if (!['caption', 'cta', 'element'].includes(type)) return json(400, { error: 'Missing or unknown type.' });

    const db = admin();
    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    const outPath = path.join(dir, 'out.mp4');

    if (type === 'caption') {
      const CAPTION_EFFECTS = ['solid', 'gradient', 'highlight-box', 'glow'];
      const projectId = body.project_id;
      if (!projectId) return json(400, { error: 'Missing project_id' });
      const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
      if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
      if (!project.transcript) return json(400, { error: 'Transcribe the video first.' });

      const style = {
        effect: CAPTION_EFFECTS.includes(body.effect) ? body.effect : 'solid',
        color: body.color || '#ffffff',
        color2: body.color2 || '#00e0c6',
        position: body.position === 'top' ? 'top' : 'bottom',
      };

      await downloadToFile(project.source_video_url, localVideo);
      const { width, height } = await probeDimensions(localVideo);

      const words = extractWords(project.transcript);
      const chunks = words.length ? chunkWords(words) : (project.transcript.text ? [{ start: 0, end: 999999, text: project.transcript.text }] : []);
      if (!chunks.length) return json(400, { error: 'No transcript text to caption.' });

      const overlays = [];
      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        const buf = renderCaptionCard({
          text: c.text, width, height,
          style: { effect: style.effect, color: style.color, gradientColors: [style.color, style.color2], position: style.position },
        });
        const p = path.join(dir, `card-${i}.png`);
        await fs.writeFile(p, buf);
        overlays.push({ pngPath: p, start: c.start, end: Math.min(c.end, 999998) });
      }

      await overlayTimedImages(localVideo, overlays, outPath);
      const finalUrl = await uploadToStorage(db, outPath, `${user.id}/caption-${projectId}-${Date.now()}.mp4`, 'video/mp4');
      await db.from('video_edit_projects').update({ captioned_video_url: finalUrl, final_video_url: finalUrl, caption_style: style, updated_at: new Date().toISOString() }).eq('id', projectId);
      await cleanupTmp(jobId);
      return json(200, { url: finalUrl });
    }

    if (type === 'cta') {
      const CTA_POSITIONS = { top: 'top', bottom: 'bottom' };
      const ctaText = (body.cta_text || '').trim();
      const position = CTA_POSITIONS[body.position] || 'bottom';
      const accent = body.accent_color || '#00e0c6';
      if (!ctaText) return json(400, { error: 'Write the CTA text first.' });

      let project = null;
      let videoUrl = (body.video_url || '').trim();
      if (body.project_id) {
        const { data } = await db.from('video_edit_projects').select('*').eq('id', body.project_id).maybeSingle();
        if (!data || data.user_id !== user.id) return json(404, { error: 'Project not found.' });
        project = data;
        videoUrl = project.final_video_url || project.source_video_url;
      }
      if (!videoUrl) return json(400, { error: 'Missing video_url' });

      await downloadToFile(videoUrl, localVideo);
      const { width, height } = await probeDimensions(localVideo);

      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');
      const margin = Math.round(height * 0.06);
      drawCtaBanner(ctx, {
        text: ctaText, width, height, accentColor: accent, position,
        y: position === 'top' ? margin : height - margin,
      });
      const overlayPath = path.join(dir, 'overlay.png');
      await fs.writeFile(overlayPath, canvas.toBuffer('image/png'));

      await overlayImageOnVideo(localVideo, overlayPath, outPath);
      const finalUrl = await uploadToStorage(db, outPath, `${user.id}/cta-${Date.now()}.mp4`, 'video/mp4');
      if (project) await db.from('video_edit_projects').update({ final_video_url: finalUrl, updated_at: new Date().toISOString() }).eq('id', project.id);
      await cleanupTmp(jobId);
      return json(200, { url: finalUrl });
    }

    // type === 'element'
    const ELEMENT_POSITIONS = {
      center: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round((h - eh) / 2) }),
      top: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round(h * 0.08) }),
      bottom: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round(h * 0.62) }),
    };
    const projectId = body.project_id;
    const imageUrl = (body.image_url || '').trim();
    const startSec = Number(body.start_sec) || 0;
    const durationSec = body.duration_sec != null ? Number(body.duration_sec) : null;
    const position = ELEMENT_POSITIONS[body.position] ? body.position : 'center';
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!imageUrl) return json(400, { error: 'Missing image_url' });

    const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    const workingUrl = project.final_video_url || project.source_video_url;

    await downloadToFile(workingUrl, localVideo);
    const { width, height } = await probeDimensions(localVideo);

    const imgRes = await fetch(imageUrl);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const img = await loadImage(imgBuf);
    const maxW = width * 0.42;
    const scale = Math.min(1, maxW / img.width);
    const ew = Math.round(img.width * scale), eh = Math.round(img.height * scale);
    const elCanvas = createCanvas(ew, eh);
    elCanvas.getContext('2d').drawImage(img, 0, 0, ew, eh);
    const elementPath = path.join(dir, 'element.png');
    await fs.writeFile(elementPath, elCanvas.toBuffer('image/png'));

    const { x, y } = ELEMENT_POSITIONS[position](width, height, ew, eh);
    await overlayImageAtTime(localVideo, elementPath, outPath, { x, y, startSec, endSec: durationSec != null ? startSec + durationSec : null });
    const finalUrl = await uploadToStorage(db, outPath, `${user.id}/element-${projectId}-${Date.now()}.mp4`, 'video/mp4');

    const elements = (Array.isArray(project.elements) ? project.elements : []).concat([{ image_url: imageUrl, start_sec: startSec, duration_sec: durationSec, position, created_at: new Date().toISOString() }]);
    await db.from('video_edit_projects').update({ final_video_url: finalUrl, elements, updated_at: new Date().toISOString() }).eq('id', projectId);
    await cleanupTmp(jobId);
    return json(200, { url: finalUrl });
  } catch (e) {
    try { await cleanupTmp(jobId); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not apply that overlay.' });
  }
}

// ---------------- Flyer Studio: Spot Fix (circle a part, say what's
// wrong, fix just that) ----------------
// "region" is the marked area as FRACTIONS (0-1) of the current final
// flyer's width/height. GPT Image 2's edit endpoint has no mask/
// inpainting parameter (checked live against WaveSpeed's own schema), so
// crop-edit-paste-back is what gets a real "only touch this part" result
// without one: crop the marked region out at full resolution (with real
// padding for context -- e.g. "match the headline's gradient" needs the
// headline visible in the crop to copy from), send ONLY that crop to
// GPT Image 2, and let job-status.js paste the result back into the
// original at the same position with a soft feathered edge once the
// async job completes.
const FLYER_SPOTFIX_MODEL = 'gpt-image-2-ws-edit';
const FLYER_SPOTFIX_FALLBACK = 'nano-banana-edit';
// Extra room around the marked box so the model can see (and match) what's
// actually around it, not just the isolated marked pixels.
const SPOTFIX_PAD_FRACTION = 0.35;
// GPT Image 2 would auto-detect aspect from the input image if
// aspect_ratio were omitted entirely -- but submitFlyerImage (shared with
// flyer-hero.js/flyer-layer.js/flyer-composite.js, which all DO want an
// explicit aspect) always sends one. A CTA-button crop is nothing like
// 4:5, so pick whichever of the model's own supported aspect values is
// closest to the actual crop's shape instead.
const SPOTFIX_ASPECT_ENUM = ['1:1', '1:2', '2:1', '1:3', '3:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '9:21', '21:9'];
function closestAspect(w, h) {
  const target = w / h;
  let best = '1:1', bestDiff = Infinity;
  for (const a of SPOTFIX_ASPECT_ENUM) {
    const [aw, ah] = a.split(':').map(Number);
    const diff = Math.abs(aw / ah - target);
    if (diff < bestDiff) { bestDiff = diff; best = a; }
  }
  return best;
}
async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Could not download image (' + res.status + ')');
  return Buffer.from(await res.arrayBuffer());
}
async function uploadBufferToStorage(db, buf, storagePath, contentType) {
  const { error } = await db.storage.from('avatars').upload(storagePath, buf, { contentType, upsert: true });
  if (error) throw new Error('Storage upload failed: ' + error.message);
  return db.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;
}

async function handleFlyerSpotFix(user, body) {
  let cost = 0;
  try {
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

    const projectId = body.project_id;
    const instruction = (body.instruction || '').trim();
    const region = body.region && typeof body.region === 'object' ? body.region : null;
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!instruction) return json(400, { error: 'Say what needs fixing there first.' });
    if (!region || [region.x, region.y, region.w, region.h].some((v) => typeof v !== 'number' || !isFinite(v))) {
      return json(400, { error: 'Circle a spot on the flyer first.' });
    }

    const db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found.' });
    if (!project.final_url) return json(400, { error: 'Composite the final flyer first — there\'s nothing to fix a spot on yet.' });

    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? FLYER_SPOTFIX_MODEL : FLYER_SPOTFIX_FALLBACK;

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    cost = IMAGE_MODELS[model];
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const originalUrl = project.final_url;
    const srcBuf = await fetchBuffer(originalUrl);
    const img = await loadImage(srcBuf);
    const W = img.width, H = img.height;

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    const rawX = clamp(Math.round(region.x * W), 0, W);
    const rawY = clamp(Math.round(region.y * H), 0, H);
    const rawW = clamp(Math.round(region.w * W), 1, W - rawX);
    const rawH = clamp(Math.round(region.h * H), 1, H - rawY);

    const padX = Math.round(rawW * SPOTFIX_PAD_FRACTION), padY = Math.round(rawH * SPOTFIX_PAD_FRACTION);
    const cx = clamp(rawX - padX, 0, W), cy = clamp(rawY - padY, 0, H);
    const cw = clamp(rawX + rawW + padX, 0, W) - cx;
    const ch = clamp(rawY + rawH + padY, 0, H) - cy;

    const cropCanvas = createCanvas(cw, ch);
    cropCanvas.getContext('2d').drawImage(img, cx, cy, cw, ch, 0, 0, cw, ch);
    const cropBuf = cropCanvas.toBuffer('image/png');
    const cropStoragePath = `${user.id}/spotfix-crop-${projectId}-${Date.now()}.png`;
    const cropUrl = await uploadBufferToStorage(db, cropBuf, cropStoragePath, 'image/png');
    const hostedCrop = await muapiHostImage(cropUrl);

    const prompt = `Edit this image: ${instruction}. This is a small cropped detail from a larger finished design — make ONLY the specific change described, keep everything else in this crop exactly as it is (same subject, same composition, same colors elsewhere, unless the instruction itself says to change them). Do not add any new text, words, logos, or watermarks unless explicitly asked to.`;
    const aspect = closestAspect(cw, ch);

    let id;
    if (wantsWS) {
      const r = await submitFlyerImage(model, { prompt, aspect, images: [hostedCrop] });
      if (!r) throw new Error('WaveSpeed did not start the job');
      id = r.requestId;
    } else {
      const sub = await fetch(`https://api.muapi.ai/api/v1/${model}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images_list: [hostedCrop], aspect_ratio: 'Auto' }),
      });
      const txt = await sub.text();
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
      if (!sub.ok) {
        let m = 'Engine HTTP ' + sub.status;
        if (j && j.detail) m = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
        else if (j && (j.error || j.message)) m = (j.error && j.error.message) || j.error || j.message;
        throw new Error(m);
      }
      id = j.request_id || j.id;
    }
    if (!id) throw new Error('Engine did not start the job');

    // job-status.js's 'flyer-spot-fix' branch reads this back to paste the
    // edited crop into the original at the exact same pixel position.
    const meta = { original_url: originalUrl, x: cx, y: cy, w: cw, h: ch };
    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-spot-fix', model, prompt: instruction, credits: cost, status: 'processing', project_id: projectId, meta });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (user && cost) await admin().rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start the fix', refunded: cost });
  }
}

// ---------------- dispatch ----------------

exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  if (event.httpMethod === 'GET') return handleAvatarStatus(event, user);
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  try {
    if (body.action === 'train') return await handleAvatarTrain(user, body);
    if (body.action === 'create') return await handleAvatarCreate(user, body);
    if (body.type) return await handleOverlay(user, body);
    if (body.op === 'flyer-spot-fix') return await handleFlyerSpotFix(user, body);
    return json(400, { error: 'Missing or unknown action.' });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Something went wrong.' });
  }
};
