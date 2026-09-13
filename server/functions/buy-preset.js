// POST /.netlify/functions/buy-preset  — buy a marketplace preset with credits.
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  if (!body.id) return json(400, { error: 'Missing preset id' });

  const { data, error } = await admin().rpc('buy_preset', { buyer: user.id, pid: body.id });
  if (error) return json(500, { error: 'Could not complete purchase.' });
  if (!data.ok) return json(data.error === 'Not enough credits' ? 402 : 400, { error: data.error });
  return json(200, data); // { ok, credits, prompt, model, aspect, owned? }
};
