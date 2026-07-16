// ============================================================
// POST /.netlify/functions/avatar-video-create   (AI Avatar Creator)
// Body: { avatar_id, script, mode?, camera_motion?, audio_url?, settings? }
//   mode: 'talking' (default — InfiniteTalk lip-sync) | 'motion' (Seedance,
//     camera-motion-directed, for walking/dressing/makeup/GRWM-style content)
//   camera_motion: free-text motion direction, used in 'motion' mode
//   audio_url: a pre-made narration the user already recorded — when set,
//     voice cloning is skipped entirely and this is used as-is
//   settings: { resolution, speed, prompt, aspect, outfit_ref, start_image }
// Kicks off a fully-automated long-form video: voice (cloned OR your own
// upload) -> slicing -> frame-chained chunks (InfiniteTalk or Seedance,
// depending on mode) -> stitching (+ audio mux for motion mode).
// The caller only ever needs avatar-video-status.js after this — every
// stage advances on its own each time that's polled (see _avatar-video.js).
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { avatarVideoCredits, estimateScriptMinutes } = require('./_packs');
const { advance } = require('./_avatar-video');

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.WAVESPEED_KEY) return json(503, { error: 'Avatar Creator is being connected (WAVESPEED_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
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
};
