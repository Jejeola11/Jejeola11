// ============================================================
// POST /.netlify/functions/claim-guest-account   (public, no auth --
// this IS how a guest-checkout buyer gets their first credentials)
// Body: { email, password, reference }
// paystack-init-guest.js sends buyers straight to Paystack with a random
// placeholder email (no prompt on our side at all) -- this is the FIRST
// place their real email is ever collected, right after a confirmed
// payment. Gated purely by proof of that payment: a payments row with
// this exact reference, status success/manual, not already claimed.
// Paystack references are long, random, unguessable, generated
// server-side per transaction -- the same trust model as a password-reset
// link, so no separate email match-check is needed beforehand. The given
// email overwrites the account's placeholder and becomes how they log in
// from now on. Once claimed, the reference is marked so it can't be
// replayed to silently take over the account again later if it ever leaked.
// ============================================================
const { admin, json } = require('./_supabase');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const reference = (body.reference || '').trim();
  if (!reference) return json(400, { error: 'Missing reference.' });
  if (!EMAIL_RE.test(email)) return json(400, { error: 'Enter a valid email.' });
  if (password.length < 8) return json(400, { error: 'Password must be at least 8 characters.' });

  const db = admin();

  const { data: payment } = await db.from('payments')
    .select('id, user_id, status, claimed_at').eq('reference', reference).maybeSingle();
  if (!payment || !['success', 'manual'].includes(payment.status)) {
    // The webhook can land a beat after Paystack's own redirect -- the
    // client retries a few times before giving up, so this isn't fatal.
    return json(404, { error: 'Payment not confirmed yet.' });
  }
  if (payment.claimed_at) return json(409, { error: 'This payment has already been claimed. Try logging in instead.' });

  const { error: updateError } = await db.auth.admin.updateUserById(payment.user_id, { email, email_confirm: true, password });
  if (updateError) {
    const taken = /already been registered|already exists/i.test(updateError.message || '');
    return json(taken ? 409 : 502, { error: taken ? 'That email is already in use on another account -- try logging in instead.' : (updateError.message || 'Could not set up your account.') });
  }

  await db.from('payments').update({ claimed_at: new Date().toISOString() }).eq('id', payment.id);

  return json(200, { ok: true, email });
};
