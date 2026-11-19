const { admin, getUser, json } = require('./_supabase');
const { countSignups, REQUIRED_SIGNUPS } = require('./_black-friday');

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Sign in to get your referral link.' });

  const db = admin();
  const [{ data: profile, error }, signups] = await Promise.all([
    db.from('profiles').select('referral_code').eq('id', user.id).single(),
    countSignups(db, user.id)
  ]);
  if (error) throw error;
  const code = profile?.referral_code;
  const response = json(200, {
    signups,
    eligible: signups >= REQUIRED_SIGNUPS,
    referral_url: code ? 'https://fuseatelier.com/atelier-v2/join.html?ref=' + encodeURIComponent(code) : null
  });
  response.headers['Cache-Control'] = 'private, no-store';
  return response;
};
