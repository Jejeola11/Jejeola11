// ============================================================
// POST /.netlify/functions/avatar-video-resync   (Avatar Creator — lipsync resync)
// Body: { avatar_video_id }
// Runs a finished long-form avatar video through Sync Labs' lipsync-2-pro
// (via WaveSpeed) — a dedicated resync pass against the SAME narration
// audio already used to generate it, for tighter mouth-sync accuracy than
// InfiniteTalk's own built-in sync. Requires the video to already be
// complete (needs its stitched output_url + narration speech_url).
// Async submit + poll via job-status.js (kind:'avatar-video-resync'), which
// saves the result onto avatar_videos.resynced_url — the ORIGINAL
// output_url is left untouched so you can compare/keep either one.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { resyncCredits } = require('./_packs');
const { submitLipsyncResync, hasWaveSpeed } = require('./_providers');

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!hasWaveSpeed()) return json(503, { error: 'Resync is being connected (WAVESPEED_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const videoId = body.avatar_video_id;
    if (!videoId) return json(400, { error: 'Missing avatar_video_id' });

    db = admin();
    const { data: video } = await db.from('avatar_videos').select('*').eq('id', videoId).maybeSingle();
    if (!video || video.user_id !== user.id) return json(404, { error: 'Video not found.' });
    if (video.stage !== 'complete') return json(400, { error: 'This video needs to finish generating first.' });
    if (!video.output_url) return json(400, { error: 'No finished video to resync.' });
    if (!video.speech_url && !video.uploaded_audio_url) return json(400, { error: 'No narration audio to resync against.' });

    cost = resyncCredits(video.total_duration_sec);
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const audioUrl = video.speech_url || video.uploaded_audio_url;
    const { requestId } = await submitLipsyncResync({ video: video.output_url, audio: audioUrl });
    // project_id is the generic "which project row does this job belong to"
    // column every other project-scoped job kind already reuses (flyer_projects,
    // video_edit_projects) — job-status.js needs it to know which
    // avatar_videos row to save resynced_url onto.
    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'avatar-video-resync', model: 'sync-lipsync-2-pro', credits: cost, status: 'processing', project_id: videoId });
    await db.from('avatar_videos').update({ resync_credits: cost }).eq('id', videoId);
    return json(200, { request_id: requestId, credits: balance, avatar_video_id: videoId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start the resync', refunded: cost });
  }
};
