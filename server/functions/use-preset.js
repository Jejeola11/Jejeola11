// POST /.netlify/functions/use-preset — record a marketplace preset use (rewards creator).
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  if (!body.id) return json(400, { error: 'Missing preset id' });
  await admin().rpc('record_preset_use', { pid: body.id, by_user: user.id });
  return json(200, { ok: true });
};
