// ============================================================
// /.netlify/functions/avatar-media   (AI Avatar Creator — training + video)
// GET  ?id=<avatar_video_id>              — poll pipeline progress
// POST { action:'train',  ... }           — attach a training photo/video/voice
// POST { action:'create', ... }           — start a long-form avatar video
// Merged from three formerly-separate functions (avatar-train.js,
// avatar-video-create.js, avatar-video-status.js) — all three transitively
// require _avatar-video.js / _ffmpeg.js, so each shipped its own duplicate
// ffmpeg(+ffprobe) binary copy (Netlify doesn't dedupe native deps across
// functions): 66MB + 142MB + 142MB = 350MB for what's really one pipeline
// with three entry points. Merging into one function cuts that to a single
// 142MB bundle — needed to get Netlify builds under the disk-space limit
// that was failing deploys with ENOSPC.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { avatarVideoCredits, estimateScriptMinutes } = require('./_packs');
const { advance } = require('./_avatar-video');
const { ensureWorkDir, cleanupTmp, downloadToFile, extractFrameAt, uploadToStorage } = require('./_ffmpeg');
const path = require('path');

async function handleStatus(event, user) {
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

async function handleTrain(user, body) {
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

async function handleCreate(user, body) {
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
    if (!audioUrl && !avatar.voice_sample_url) return json(400, { error: 'Upload a voice sample, or attach your own pre-made audio, first.' });
    const masterFrame = settings.start_image || avatar.trained_frame_url || avatar.model_sheet_url || avatar.image_url;
    if (!masterFrame) return json(400, { error: 'This avatar has no reference photo yet.' });

    const minutes = estimateScriptMinutes(script);
    cost = avatarVideoCredits(minutes, !audioUrl);

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

exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  if (event.httpMethod === 'GET') return handleStatus(event, user);
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  try {
    if (body.action === 'train') return await handleTrain(user, body);
    if (body.action === 'create') return await handleCreate(user, body);
    return json(400, { error: 'Missing or unknown action.' });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Something went wrong.' });
  }
};
