// POST /.netlify/functions/daily-claim  — claim today's streak credit.
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  const { data, error } = await admin().rpc('claim_daily', { uid: user.id });
  if (error) return json(500, { error: 'Could not claim today.' });
  return json(200, data);
};
