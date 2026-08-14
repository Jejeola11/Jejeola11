// ============================================================
// POST /.netlify/functions/admin-grant   (owner/admin only)
// Body: { email, pack?, credits? }. Manually fulfils a buyer who paid by transfer.
//   - pack:    apply a plan/bundle (credits doubled while FOUNDING is on)
//   - credits: grant an exact number of credits (for corrections / top-ups)
// At least one of pack or credits is required.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { PACKS, creditsForPack, promoActive, PROMO } = require('./_packs');

exports.handler = async (event) => {
  let db;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    db = admin();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const email = (body.email || '').trim();
    const pack = body.pack ? PACKS[body.pack] : null;
    const custom = parseInt(body.credits, 10) || 0;
    // course: unlock a specific course by its module key (e.g. 'wk-course' = The $500 Week).
    const course = (body.course || '').trim();
    if (!email) return json(400, { error: 'Enter the buyer\'s email.' });
    if (!pack && custom <= 0 && !course) return json(400, { error: 'Pick a pack, a course, or enter a credit amount.' });

    // Find the buyer's account by email.
    const { data: rows } = await db.from('profiles').select('id, email').ilike('email', email).limit(1);
    const target = rows && rows[0];
    if (!target) return json(404, { error: 'No account with that email yet — ask them to sign up first, then grant.' });

    // Course-only grant: unlock the course for this buyer and return (no plan change).
    // The $500 Week comes with a 100-credit creation bonus by default. For other
    // courses (e.g. Fuse Atelier), the caller decides the bonus via bonus_credits —
    // "not all of em gets the 500 credits" — it's an option per grant, not automatic.
    const bonusCredits = parseInt(body.bonus_credits, 10) || 0;
    // Real ₦ the buyer paid (WhatsApp/bank transfer, confirmed manually before
    // this grant is made). This used to be hardcoded to 0 for every course
    // grant, which is why "$500 Week" showed ₦0 revenue in the payments table
    // even though buyers paid ₦10,000 each — defaults to the known real price
    // per course when not passed explicitly, but the caller can always send
    // the exact amount actually received.
    // Per-course real price, used when the caller doesn't pass the exact
    // amount. Lane A is ₦5,000; a manual grant at a discount should still be
    // recorded at what was ACTUALLY received, so pass amount_naira for those.
    const COURSE_PRICE = { 'wk-course': 10000, 'atelier-lane-a': 5000 };
    const amountNaira = parseInt(body.amount_naira, 10) || COURSE_PRICE[course] || 0;
    if (course && !pack && custom <= 0) {
      const { data: existing } = await db.from('module_unlocks').select('module_key').eq('user_id', target.id).eq('module_key', course).maybeSingle();
      let bonus = 0;
      if (!existing) {
        await db.from('module_unlocks').insert({ user_id: target.id, module_key: course });
        bonus = bonusCredits > 0
          ? (course === 'atelier-full' && promoActive() ? PROMO.courseCredits : bonusCredits)
          : (course === 'wk-course' ? 100 : 0);
        if (bonus > 0) {
          try { await db.rpc('add_credits', { uid: target.id, amount: bonus, why: course + '-bonus' }); } catch (e) { bonus = 0; }
        }
      }
      try {
        await db.from('payments').insert({ user_id: target.id, reference: 'course-' + Date.now() + '-' + email, amount_naira: amountNaira, pack: course, credits_added: bonus, status: 'manual' });
      } catch (e) {}
      return json(200, { ok: true, email: target.email, course, credits: bonus, granted: 'course' });
    }

    // Credits: when a pack is selected, its credit count is ALWAYS authoritative
    // (via creditsForPack, which also applies any active launch-promo
    // multiplier) — `custom` is only honored when no pack is selected, as a
    // pure top-up/correction. This used to let `custom` silently override a
    // selected pack's credits (e.g. a creator_mo grant giving 500 credits
    // instead of the plan's defined 350, because the admin form pre-fills the
    // custom field and it was never cleared) — closed 10 Aug 2026.
    const credits = pack ? creditsForPack(body.pack, pack.credits) : custom;
    const promoApplied = !!pack && credits !== pack.credits;

    await db.rpc('add_credits', { uid: target.id, amount: credits, why: pack ? 'manual_grant' : 'manual_topup' });

    // Apply plan only when a subscription/course pack was chosen.
    if (pack && (pack.kind === 'sub' || pack.kind === 'course')) {
      const plan = pack.plan || 'pro';
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.from('profiles').update({ plan, plan_expires_at: expires, plan_source: pack.kind === 'course' ? 'course_bonus' : 'admin_grant' }).eq('id', target.id);
    }
    try {
      await db.from('payments').insert({
        user_id: target.id, reference: 'manual-' + Date.now() + '-' + email,
        amount_naira: pack ? pack.amount_naira : 0, pack: body.pack || 'custom', credits_added: credits, status: 'manual',
      });
    } catch (e) {}

    return json(200, { ok: true, email: target.email, credits, promo: promoApplied, plan: pack ? (pack.plan || pack.kind) : 'top-up' });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Grant failed — try again.' });
  }
};
