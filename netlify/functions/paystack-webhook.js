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
const { PACKS, creditsForPack } = require('./_packs');
const { sweepToBank } = require('./_payout');

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

  // 3) Credit the user — multiplied during the launch promo for subscription
  // packs, or overridden to a flat bonus for the course pack (see _packs.js).
  const credits = creditsForPack(meta.pack, pack.credits);
  await db.rpc('add_credits', { uid: userId, amount: credits, why: 'purchase' });

  // 4) Subscription packs also extend plan access by 30 days.
  if (pack.kind === 'sub') {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('profiles').update({ plan: pack.plan, plan_expires_at: expires, plan_source: 'subscription' }).eq('id', userId);
  }

  // 4b) Course packs unlock their content. Tiered Atelier packs carry their
  // own course key ('atelier-starter'|'atelier-creator'|'atelier-empire'|
  // 'atelier-vault'); the legacy single-price pack unlocks 'atelier-full'.
  // Higher tiers imply the lower ones so gating checks stay simple.
  if (pack.kind === 'course') {
    const keys = pack.course
      ? { 'atelier-starter': ['atelier-starter'],
          'atelier-creator': ['atelier-starter', 'atelier-creator'],
          'atelier-empire':  ['atelier-starter', 'atelier-creator', 'atelier-empire'],
        }[pack.course] || [pack.course]
      : ['atelier-full'];
    for (const key of keys) {
      try { await db.from('module_unlocks').insert({ user_id: userId, module_key: key }); } catch (e) {}
    }
  }

  // 4c) Course tiers that carry a plan (Creator/Empire) also get 30 days of
  // that plan so premium studio features work during their first month.
  // plan_source: 'course_bonus' -- NOT the same thing as actually buying the
  // Studio subscription (see schema-phase26.sql) -- keep the two auditable.
  if (pack.kind === 'course' && pack.plan) {
    const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.from('profiles').update({ plan: pack.plan, plan_expires_at: expires, plan_source: 'course_bonus' }).eq('id', userId);
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

  // 6) Sweep the payment straight to the real bank account (see _payout.js)
  // instead of waiting on Paystack's own settlement schedule. The customer
  // already got their credits/unlock above — a payout hiccup here must
  // never undo that or fail this webhook (Paystack would just retry it).
  try { await sweepToBank(db, amountNaira, reference); } catch (e) { console.error('payout sweep failed:', e && e.message); }

  return { statusCode: 200, body: 'ok' };
};
