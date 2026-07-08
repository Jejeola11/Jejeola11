// ============================================================
// POST /.netlify/functions/atelier-review   (admin-only)
// Ria leaves a review note on a Lab/Arena submission.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  const { isAdmin } = await getPlan(user.id);
  if (!isAdmin) return json(403, { error: 'Admin only.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const id = body.id;
  const review_note = (body.review_note || '').trim();
  if (!id) return json(400, { error: 'Missing submission id.' });

  const db = admin();
  const { error } = await db.from('atelier_submissions')
    .update({ reviewed: true, review_note, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return json(500, { error: error.message });
  return json(200, { ok: true });
};
