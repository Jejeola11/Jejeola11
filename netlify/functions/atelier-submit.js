// ============================================================
// POST /.netlify/functions/atelier-submit
// The Lab (kind:'lab') and The Arena (kind:'arena') — students submit
// a deliverable/link; Ria reviews later via atelier-review.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const kind = body.kind === 'arena' ? 'arena' : 'lab';
  const lesson_key = (body.lesson_key || '').trim() || null;
  const content_url = (body.content_url || '').trim() || null;
  const caption = (body.caption || '').trim();
  if (!content_url && !caption) return json(400, { error: 'Add a link or a note about your work.' });

  const db = admin();
  const { error } = await db.from('atelier_submissions').insert({ user_id: user.id, kind, lesson_key, content_url, caption });
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
};
