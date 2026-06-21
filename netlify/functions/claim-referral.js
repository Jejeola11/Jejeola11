// ============================================================
// POST /.netlify/functions/claim-referral
// Auth required. Body: { code: '<referrer referral_code>' }
// Called right after a new user signs up (if they arrived via ?ref=CODE).
// Rewards the referrer + gives the new user a small welcome bonus — once.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { REFERRAL } = require('./_packs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Sign in first.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const code = (body.code || '').trim().toLowerCase();
  if (!code) return json(200, { applied: false });

  const db = admin();
  const { data: ref } = await db.from('profiles').select('id').eq('referral_code', code).maybeSingle();
  if (!ref) return json(200, { applied: false, reason: 'unknown code' });

  const { data: applied } = await db.rpc('apply_referral', {
    referee: user.id, referrer: ref.id, reward: REFERRAL.reward, bonus: REFERRAL.bonus,
  });
  return json(200, { applied: !!applied });
};
