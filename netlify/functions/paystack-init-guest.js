// ============================================================
// POST /.netlify/functions/paystack-init-guest   (public, no auth)
// Body: { pack, email }
// The landing-page tier buttons hit this instead of paystack-init.js --
// no account required to start checkout. Same server-side pricing trust
// as the authenticated version (_packs.js only), but the created Paystack
// transaction carries only the buyer's email in metadata, not a user_id --
// none exists yet. paystack-webhook.js resolves (finds or creates) the
// real account once payment is actually confirmed; the client claims it
// via claim-guest-account.js after landing back on ?paid=1.
//
// Only atelier course packs are meant to go through this door -- studio
// credit top-ups/subscriptions bought from inside the app should keep
// using the authenticated paystack-init.js, unchanged.
// ============================================================
const { json } = require('./_supabase');
const { PACKS } = require('./_packs');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const pack = PACKS[body.pack];
  if (!pack) return json(400, { error: 'Unknown pack.' });

  const email = (body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) return json(400, { error: 'Enter a valid email.' });

  const appUrl = process.env.APP_URL || '';
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      amount: pack.amount_naira * 100, // kobo
      currency: 'NGN',
      channels: ['bank_transfer', 'card', 'bank', 'ussd'],
      callback_url: `${appUrl}/studio?paid=1&pack=${encodeURIComponent(body.pack)}&guest=1&email=${encodeURIComponent(email)}`,
      metadata: {
        guest_email: email,
        pack: body.pack,
        custom_fields: [{ display_name: 'Pack', variable_name: 'pack', value: pack.label }],
      },
    }),
  });

  const data = await res.json();
  if (!data.status) return json(502, { error: data.message || 'Could not start payment.' });

  return json(200, { authorization_url: data.data.authorization_url });
};
