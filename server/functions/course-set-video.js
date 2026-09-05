// ============================================================
// POST /.netlify/functions/course-set-video   (admin only)
// Body: { lesson_key, url }. Sets/updates the video URL for a lesson so it
// loads in the course player for everyone. The owner's "upload from my own
// admin" — paste a YouTube/Vimeo/MP4 link and it goes live.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    const db = admin();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const lesson_key = (body.lesson_key || '').trim();
    if (!lesson_key) return json(400, { error: 'Missing lesson_key' });
    // url and duration_sec are independently optional -- a duration-only
    // call (from openLesson()'s live duration capture) must not blank out
    // an existing url, and vice versa. Only set what was actually sent.
    const hasUrl = typeof body.url === 'string';
    const hasDuration = body.duration_sec != null && Number.isFinite(Number(body.duration_sec));
    if (!hasUrl && !hasDuration) return json(400, { error: 'Nothing to save.' });

    // Supabase's upsert only SETs columns actually present in the object --
    // omitting url/duration_sec here (rather than sending an empty string
    // or null) leaves whichever one wasn't touched exactly as it was.
    const patch = { lesson_key, updated_at: new Date().toISOString() };
    if (hasUrl) patch.url = body.url.trim();
    if (hasDuration) patch.duration_sec = Math.round(Number(body.duration_sec));

    await db.from('course_videos').upsert(patch, { onConflict: 'lesson_key' });
    return json(200, { ok: true, lesson_key, url: patch.url, duration_sec: patch.duration_sec });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not save video.' });
  }
};
