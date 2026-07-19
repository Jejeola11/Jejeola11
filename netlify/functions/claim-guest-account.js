// ============================================================
// POST /.netlify/functions/claim-guest-account   (public, no auth --
// this IS how a guest-checkout buyer gets their first credentials)
// Body: { email, password, reference }
// After a guest-checkout payment succeeds, paystack-webhook.js has already
// created a real (passwordless) account for that email. This is the one
// place that sets the password on it, gated purely by proof of a real,
// confirmed payment: a payments row with that exact reference, status
// success/manual, whose owning account's email matches the one given.
// Paystack references are long, random, unguessable, generated
// server-side per transaction -- the same trust model as a password-reset
// link. Once claimed, the reference is marked so it can't be replayed to
// silently reset the password again later if it ever leaked.
// ============================================================
const { admin, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const reference = (body.reference || '').trim();
  if (!email || !reference) return json(400, { error: 'Missing email or reference.' });
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

  const { data: profile } = await db.from('profiles').select('id, email').eq('id', payment.user_id).maybeSingle();
  if (!profile || (profile.email || '').toLowerCase() !== email) {
    return json(403, { error: 'This reference doesn\'t match that email.' });
  }

  const { error: pwError } = await db.auth.admin.updateUserById(profile.id, { password });
  if (pwError) return json(502, { error: pwError.message || 'Could not set password.' });

  await db.from('payments').update({ claimed_at: new Date().toISOString() }).eq('id', payment.id);

  return json(200, { ok: true, email });
};
