// ============================================================
// POST /.netlify/functions/paystack-init-guest   (public, no auth)
// Body: { pack, code? }
// The landing-page tier buttons hit this instead of paystack-init.js --
// no account required, and (as of this version) no email prompt on our
// side either -- tapping a tier goes straight to Paystack checkout. Same
// server-side pricing trust as the authenticated version (_packs.js only).
//
// Paystack's initialize API requires an email on every transaction, but
// we don't have the buyer's real one yet (that's the whole point -- zero
// friction before checkout), so a random placeholder goes in its place.
// paystack-webhook.js creates the real account against that placeholder
// once payment is confirmed; the buyer supplies their REAL email for the
// first time on the claim-account screen right after paying (see
// claim-guest-account.js), which overwrites the placeholder.
//
// Optional `code`: a limited-slot promo code (see schema-phase29.sql /
// insider.html). This is only a READ-ONLY availability check -- it does
// NOT reserve a slot, so an abandoned checkout never burns one. If the
// code is invalid/exhausted, checkout still proceeds at full price rather
// than blocking the sale entirely (a stale/typo'd code shouldn't be able
// to stop someone from paying).
//
// Only atelier course packs are meant to go through this door -- studio
// credit top-ups/subscriptions bought from inside the app should keep
// using the authenticated paystack-init.js, unchanged.
// ============================================================
const crypto = require('crypto');
const { admin, json } = require('./_supabase');
const { PACKS } = require('./_packs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const pack = PACKS[body.pack];
  if (!pack) return json(400, { error: 'Unknown pack.' });

  const placeholderEmail = `guest-${crypto.randomUUID()}@guest.fuseatelier.ng`;

  let amountNaira = pack.amount_naira;
  const code = (body.code || '').trim().toUpperCase();
  let promoCode = null;
  if (code) {
    const db = admin();
    const { data: promo } = await db.from('promo_codes')
      .select('discount_naira, max_redemptions, redeemed_count, active').eq('code', code).maybeSingle();
    if (promo && promo.active && promo.redeemed_count < promo.max_redemptions) {
      amountNaira = Math.max(500, pack.amount_naira - promo.discount_naira);
      promoCode = code;
    }
  }

  const appUrl = process.env.APP_URL || '';
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: placeholderEmail,
      amount: amountNaira * 100, // kobo
      currency: 'NGN',
      channels: ['bank_transfer', 'card', 'bank', 'ussd'],
      callback_url: `${appUrl}/studio?paid=1&pack=${encodeURIComponent(body.pack)}&guest=1`,
      metadata: {
        guest_email: placeholderEmail,
        pack: body.pack,
        promo_code: promoCode,
        custom_fields: [{ display_name: 'Pack', variable_name: 'pack', value: pack.label }],
      },
    }),
  });

  const data = await res.json();
  if (!data.status) return json(502, { error: data.message || 'Could not start payment.' });

  return json(200, { authorization_url: data.data.authorization_url });
};
