// ============================================================
// GET /.netlify/functions/validate-promo?code=WEEK500   (public, no auth)
// Read-only availability check so a page can show the discounted price
// (and remaining-slot count) before checkout. Does NOT reserve a slot --
// only paystack-webhook.js does that, and only after a real payment
// actually confirms (see schema-phase29.sql for why). Opening this and
// then abandoning checkout never burns one of the limited slots.
// ============================================================
const { admin, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const code = ((event.queryStringParameters || {}).code || '').trim().toUpperCase();
  if (!code) return json(400, { error: 'Missing code.' });

  const db = admin();
  const { data: promo } = await db.from('promo_codes')
    .select('discount_naira, max_redemptions, redeemed_count, active').eq('code', code).maybeSingle();

  if (!promo || !promo.active || promo.redeemed_count >= promo.max_redemptions) {
    return json(200, { valid: false });
  }
  return json(200, {
    valid: true,
    discount_naira: promo.discount_naira,
    remaining: promo.max_redemptions - promo.redeemed_count,
  });
};
