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
    const url = (body.url || '').trim();
    if (!lesson_key) return json(400, { error: 'Missing lesson_key' });

    await db.from('course_videos').upsert({ lesson_key, url, updated_at: new Date().toISOString() }, { onConflict: 'lesson_key' });
    return json(200, { ok: true, lesson_key, url });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not save video.' });
  }
};
