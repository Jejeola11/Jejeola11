// ============================================================
// POST /.netlify/functions/video-transcribe   (Video Editing Studio)
// Body: { project_id?, video_url }
// Inserts a pending job and returns immediately — the actual work
// (download the video, extract audio via ffmpeg, host it, submit to
// MuAPI's openai-whisper) happens lazily on the FIRST poll in
// job-status.js. Doing all of that inline in this POST handler used to
// run well past Netlify's function execution window on anything but a
// very short clip, killing the connection mid-request — the browser saw
// a raw "Failed to fetch" (not even a clean error response), never a
// timeout the frontend could explain. Same lazy-completion pattern used
// for Resemble audio and every chat/brief endpoint elsewhere in this app.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

const MODEL = 'openai-whisper';
const TRANSCRIBE_COST = 3;

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Editing Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const videoUrl = (body.video_url || '').trim();
    if (!videoUrl) return json(400, { error: 'Missing video_url' });

    db = admin();
    let projectId = body.project_id;
    if (projectId) {
      const { data: existing } = await db.from('video_edit_projects').select('id, user_id').eq('id', projectId).maybeSingle();
      if (!existing || existing.user_id !== user.id) return json(404, { error: 'Project not found.' });
    } else {
      const { data: newProj } = await db.from('video_edit_projects').insert({ user_id: user.id, source_video_url: videoUrl }).select().single();
      projectId = newProj && newProj.id;
    }

    cost = TRANSCRIBE_COST;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const requestId = 'vt:' + Date.now() + '-' + Math.random().toString(36).slice(2, 10);
    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'video-transcribe', model: MODEL, prompt: videoUrl, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: requestId, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start transcription', refunded: cost });
  }
};
