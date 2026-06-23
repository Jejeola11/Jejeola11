// ============================================================
// POST /.netlify/functions/paystack-webhook
// Paystack calls this when a payment succeeds. We:
//   1. verify the signature (so only real Paystack events are trusted)
//   2. credit the user (idempotent by reference — never double-credit)
//   3. extend plan access for subscription packs
// Set this URL in Paystack → Settings → API Keys & Webhooks → Webhook URL.
// ============================================================
const crypto = require('crypto');
const { admin } = require('./_supabase');
const { PACKS } = require('./_packs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  // 1) Verify signature over the RAW body.
  const signature = event.headers['x-paystack-signature'];
  const expected = crypto
    .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
    .update(event.body || '')
    .digest('hex');
  if (!signature || signature !== expected) {
    return { statusCode: 401, body: 'Invalid signature' };
  }

  let payload;
  try { payload = JSON.parse(event.body); } catch (e) { return { statusCode: 400, body: 'Bad body' }; }

  if (payload.event !== 'charge.success') {
    return { statusCode: 200, body: 'ignored' };
  }

  const d = payload.data || {};
  const reference = d.reference;
  const meta = d.metadata || {};
  const userId = meta.user_id;
  const pack = PACKS[meta.pack];
  const amountNaira = Math.round((d.amount || 0) / 100);

  if (!reference || !userId || !pack) {
    return { statusCode: 200, body: 'missing data' };
  }

  const db = admin();

  // 2) Idempotency — if we've already recorded this reference, stop.
  const { data: existing } = await db
    .from('payments').select('id').eq('reference', reference).maybeSingle();
  if (existing) return { statusCode: 200, body: 'already processed' };

  // 3) Credit the user — first 50 paying members get a one-time 2x bonus.
  let credits = pack.credits;
  let founding = false;
  try {
    const { data } = await db.rpc('claim_founding', { uid: userId });
    founding = !!data;
  } catch (e) {}
  if (founding) credits *= 2;
  await db.rpc('add_credits', { uid: userId, amount: credits, why: founding ? 'founding_2x' : 'purchase' });

  // 4) Subscription packs also extend plan access by 30 days.
  if (pack.kind === 'sub') {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('profiles').update({ plan: pack.plan, plan_expires_at: expires }).eq('id', userId);
  }

  // 5) Record the payment.
  await db.from('payments').insert({
    user_id: userId,
    reference,
    amount_naira: amountNaira,
    pack: meta.pack,
    credits_added: credits,
    status: 'success',
    raw: d,
  });

  return { statusCode: 200, body: 'ok' };
};
