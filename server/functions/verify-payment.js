// ============================================================
// POST /.netlify/functions/verify-payment
// Body: { reference }
// The ONLY thing allowed to tell the client "yes, this was a real,
// successful payment" -- used to gate the Meta Pixel Purchase event.
//
// Paystack's callback_url redirect (?paid=1&pack=... in studio.html) fires
// whenever a checkout attempt reaches ANY terminal state -- a declined
// card, an abandoned OTP, a cancelled payment -- not just a successful
// charge. The Purchase pixel was firing on every one of those redirects
// unconditionally, meaning Meta's "purchases" count included failed and
// abandoned attempts, not just real sales. This function checks the one
// place a payment is only ever recorded as real: a `payments` row with
// status='success', written exclusively by paystack-webhook.js after
// verifying Paystack's own HMAC signature on a genuine charge.success
// event. If that row doesn't exist (yet, or ever), this returns
// verified:false and the pixel simply doesn't fire -- an undercount is
// far safer for ad optimization than the overcount this replaces.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const reference = (body.reference || '').trim();
  if (!reference) return json(400, { error: 'Missing reference' });

  const db = admin();
  const { data: row } = await db.from('payments').select('user_id, status, amount_naira, pack')
    .eq('reference', reference).maybeSingle();

  // Only verified if it belongs to the caller and is a real confirmed success --
  // never trust a reference someone could just make up client-side.
  const verified = !!(row && row.user_id === user.id && row.status === 'success');
  return json(200, { verified, amount_naira: verified ? row.amount_naira : null, pack: verified ? row.pack : null });
};
