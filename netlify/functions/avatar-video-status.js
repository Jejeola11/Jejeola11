// ============================================================
// GET /.netlify/functions/avatar-video-status?id=<avatar_video_id>
// Auth required. The browser calls this every few seconds — each call
// advances the pipeline by exactly one bounded step (see _avatar-video.js)
// and reports the current stage/progress. No separate trigger, no manual
// "next chunk" call — polling IS the automation.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { advance } = require('./_avatar-video');

exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
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
};
