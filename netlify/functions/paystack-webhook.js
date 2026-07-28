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
  const amountNaira = Math.round((d.amount || 0) / 100);

  if (!reference) return { statusCode: 200, body: 'missing data' };

  const db = admin();

  // 2) Idempotency — if we've already recorded this reference, stop. Checked
  // BEFORE resolving/creating a user below, so a Paystack webhook retry
  // (it does retry on anything but a prompt 200) can never create a second
  // duplicate guest account for the same payment.
  const { data: existing } = await db
    .from('payments').select('id').eq('reference', reference).maybeSingle();
  if (existing) return { statusCode: 200, body: 'already processed' };

  // 1b) Freelance client invoices (see freelance-invoice.js) -- a one-off
  // payment from someone with no Fuse Studio account at all (Sandeep,
  // Michael, etc.). No credits, no course unlock, no user record beyond
  // logging it under the admin who created the invoice: just record the
  // payment and sweep it to your bank the same way every other Fuse
  // Studio payment already does -- same-day, no extra fee, no manual
  // dashboard clicking. Handled entirely separately from the
  // pack-purchase flow below since there's no PACKS entry for it.
  if (meta.kind === 'freelance') {
    try {
      await db.from('payments').insert({
        user_id: meta.admin_user_id || null,
        reference, amount_naira: amountNaira, pack: 'freelance', credits_added: 0,
        status: 'success', raw: d,
      });
    } catch (e) {}
    try { await sweepToBank(db, amountNaira, reference); } catch (e) { console.error('freelance payout sweep failed:', e && e.message); }
    return { statusCode: 200, body: 'ok (freelance)' };
  }

  const pack = PACKS[meta.pack];
  if (!pack) return { statusCode: 200, body: 'missing data' };

  // 3) Resolve the buyer's account. Logged-in purchases (from inside the
  // app) carry meta.user_id directly. Guest checkouts (landing-page tier
  // buttons -- see paystack-init-guest.js) only carry the email Paystack
  // collected, since no account exists yet at checkout time: find an
  // existing account by that email, or create one now that payment is
  // actually confirmed. This IS the "sign up happens after payment"
  // flow -- the account is real, service-role-created, and picks up its
  // profiles row automatically via the on_auth_user_created trigger.
  let userId = meta.user_id;
  if (!userId && meta.guest_email) {
    const email = meta.guest_email;
    const { data: existingProfile } = await db.from('profiles').select('id').ilike('email', email).maybeSingle();
    if (existingProfile) {
      userId = existingProfile.id;
    } else {
      const { data: created, error } = await db.auth.admin.createUser({ email, email_confirm: true });
      if (error || !created || !created.user) {
        console.error('guest account create failed:', error && error.message);
        return { statusCode: 200, body: 'account create failed' }; // Paystack will retry
      }
      userId = created.user.id;
    }
  }
  if (!userId) return { statusCode: 200, body: 'missing user' };

  // 4) Credit the user — multiplied during the launch promo for subscription
  // packs, or overridden to a flat bonus for the course pack (see _packs.js).
  // add_credits (see schema-phase31.sql) now RAISES if `userId` doesn't match
  // a profiles row instead of silently leaving the balance untouched — that
  // used to mean a real, confirmed Paystack payment could land with zero
  // credits added and zero trace of it anywhere. If that ever happens again,
  // record it as a visibly-failed payment (not a false "success") instead of
  // pretending fulfillment worked — nothing downstream here (plan/course
  // unlocks) would work either without the same profiles row, so bail out
  // honestly rather than papering over it.
  const credits = creditsForPack(meta.pack, pack.credits);
  try {
    await db.rpc('add_credits', { uid: userId, amount: credits, why: 'purchase' });
  } catch (e) {
    console.error('add_credits failed — no profiles row for', userId, 'pack', meta.pack, e && e.message);
    await db.from('payments').insert({
      user_id: userId, reference, amount_naira: amountNaira, pack: meta.pack,
      credits_added: 0, status: 'credit_failed', raw: d,
    });
    return { statusCode: 200, body: 'credit grant failed — needs manual reconciliation' };
  }

  // 4a) Subscription packs also extend plan access by 30 days.
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
          // Standalone Money Engine purchase -- grants the 3 legacy
          // per-module keys the course already gates on (see course.js's
          // "money" family + app.js's moduleUnlocked()'s courseUnlocks.has(mKey)
          // fallback), NOT a course-tier key. A tier key would make
          // atelierTier() return 0 for this buyer (it only recognizes the 3
          // real atelier-* keys) and unlock nothing; these 3 module keys are
          // exactly what moduleUnlocked() checks per-lesson, so this grants
          // only the Money Engine skills -- no flyers, no credits, no other
          // families -- matching what was actually sold at money-engine.html.
          'money-engine': ['money-m1', 'money-m2', 'money-m3'],
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

  // 4d) Redeem the promo code, if this checkout used one (see
  // paystack-init-guest.js / schema-phase29.sql) -- ONLY now, against a
  // real confirmed payment, via the atomic RPC so concurrent webhook calls
  // can never push redemptions past the slot cap. If it returns no rows
  // (the code got exhausted by other confirmed payments in the tiny window
  // between this buyer's checkout-init and now -- only possible if the
  // slot count is genuinely being raced), the sale still stands: they
  // already paid the discounted amount, fulfillment above already ran, and
  // undoing a real payment over an edge-case slot race would be a far
  // worse outcome than letting one extra redemption through.
  if (meta.promo_code) {
    const { data: redeemed, error: redeemErr } = await db.rpc('redeem_promo_code', { p_code: meta.promo_code });
    if (redeemErr || !redeemed || !redeemed.length) {
      console.error('promo code redeem miss (sale still honored):', meta.promo_code, redeemErr && redeemErr.message);
    }
  }

  // 5) Record the payment.
  await db.from('payments').insert({
    user_id: userId,
    reference,
    amount_naira: amountNaira,
    pack: meta.pack,
    credits_added: credits,
    status: 'success',
    promo_code: meta.promo_code || null,
    raw: d,
  });

  // 6) Sweep the payment straight to the real bank account (see _payout.js)
  // instead of waiting on Paystack's own settlement schedule. The customer
  // already got their credits/unlock above — a payout hiccup here must
  // never undo that or fail this webhook (Paystack would just retry it).
  try { await sweepToBank(db, amountNaira, reference); } catch (e) { console.error('payout sweep failed:', e && e.message); }

  return { statusCode: 200, body: 'ok' };
};
