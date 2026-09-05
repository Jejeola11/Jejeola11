// POST /.netlify/functions/claim-learn-bonus — one-time bonus for finishing lessons.
const { admin, getUser, json } = require('./_supabase');

const LEARN_BONUS = 20; // credits

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  const { data, error } = await admin().rpc('claim_learn_bonus', { uid: user.id, amount: LEARN_BONUS });
  if (error) return json(500, { error: 'Could not claim bonus.' });
  return json(200, data);
};
