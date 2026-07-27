// ============================================================
// POST /.netlify/functions/paystack-init-guest   (public, no auth)
// Body: { pack, code?, name?, email?, whatsapp? }
// The landing-page tier buttons hit this instead of paystack-init.js --
// no account required. Both landing pages now show a lead-capture modal
// (name/email/WhatsApp) before this call, so a real email is usually
// available -- if so, it's used directly instead of a random placeholder,
// meaning the account paystack-webhook.js creates on confirmed payment is
// already keyed to the buyer's real address (the claim-account screen
// still runs afterward to set their password, unrelated to which email
// was used here). Falls back to the old placeholder if no email came
// through, so this endpoint still works for any caller that skips the
// modal. `name`/`whatsapp` are stored as a lead (see below) even if the
// buyer never completes payment -- that's the whole point of asking
// upfront instead of only after checkout succeeds.
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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const pack = PACKS[body.pack];
  if (!pack) return json(400, { error: 'Unknown pack.' });

  const name = (body.name || '').trim().slice(0, 200) || null;
  const whatsapp = (body.whatsapp || '').trim().slice(0, 40) || null;
  const typedEmail = (body.email || '').trim().toLowerCase();
  const realEmail = EMAIL_RE.test(typedEmail) ? typedEmail : null;
  const placeholderEmail = realEmail || `guest-${crypto.randomUUID()}@guest.fuseatelier.ng`;

  const db = admin();
  // Best-effort lead capture -- never blocks checkout if this fails
  // (missing table before the migration runs, transient DB hiccup, etc).
  if (name || realEmail || whatsapp) {
    try { await db.from('atelier_leads').insert({ name, email: realEmail, whatsapp, pack: body.pack }); } catch (e) {}
  }

  let amountNaira = pack.amount_naira;
  const code = (body.code || '').trim().toUpperCase();
  let promoCode = null;
  if (code) {
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
        custom_fields: [
          { display_name: 'Pack', variable_name: 'pack', value: pack.label },
          ...(name ? [{ display_name: 'Name', variable_name: 'name', value: name }] : []),
          ...(whatsapp ? [{ display_name: 'WhatsApp', variable_name: 'whatsapp', value: whatsapp }] : []),
        ],
      },
    }),
  });

  const data = await res.json();
  if (!data.status) return json(502, { error: data.message || 'Could not start payment.' });

  return json(200, { authorization_url: data.data.authorization_url });
};
