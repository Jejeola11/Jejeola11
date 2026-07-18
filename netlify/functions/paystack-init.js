// ============================================================
// POST /.netlify/functions/paystack-init
// Auth required. Body: { pack: 'starter' | 'creator' | ... }
// Creates a Paystack transaction and returns the checkout URL.
// The Paystack page offers "Pay with transfer" — money settles to YOUR bank.
// We trust ONLY the server-side price from _packs.js (never the browser).
// ============================================================
const { getUser, json } = require('./_supabase');
const { PACKS } = require('./_packs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const pack = PACKS[body.pack];
  if (!pack) return json(400, { error: 'Unknown pack.' });

  const appUrl = process.env.APP_URL || '';
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      amount: pack.amount_naira * 100, // Paystack uses kobo
      currency: 'NGN',
      // Let customers pay by bank transfer (and card/ussd if they prefer).
      channels: ['bank_transfer', 'card', 'bank', 'ussd'],
      callback_url: `${appUrl}/studio?paid=1&pack=${encodeURIComponent(body.pack)}`,
      metadata: {
        user_id: user.id,
        pack: body.pack,
        custom_fields: [{ display_name: 'Pack', variable_name: 'pack', value: pack.label }],
      },
    }),
  });

  const data = await res.json();
  if (!data.status) return json(502, { error: data.message || 'Could not start payment.' });

  return json(200, { authorization_url: data.data.authorization_url });
};
