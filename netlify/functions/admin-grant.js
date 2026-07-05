// ============================================================
// POST /.netlify/functions/admin-grant   (owner/admin only)
// Body: { email, pack?, credits? }. Manually fulfils a buyer who paid by transfer.
//   - pack:    apply a plan/bundle (credits doubled while FOUNDING is on)
//   - credits: grant an exact number of credits (for corrections / top-ups)
// At least one of pack or credits is required.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { PACKS } = require('./_packs');

// First-50 founding offer has ended — grants now deliver the normal credit
// amount (a ₦9k Creator gives 350, not 700). Bump back to 2 only if you run
// this promo again.
const FOUNDING_MULTIPLIER = 1;

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
    // The $500 Week comes with a 100-credit creation bonus for buyers — that's the
    // "free credits to create with" promise (the normal signup trial stays at 12).
    if (course && !pack && custom <= 0) {
      const { data: existing } = await db.from('module_unlocks').select('module_key').eq('user_id', target.id).eq('module_key', course).maybeSingle();
      let bonus = 0;
      if (!existing) {
        await db.from('module_unlocks').insert({ user_id: target.id, module_key: course });
        if (course === 'wk-course') {
          bonus = 100;
          try { await db.rpc('add_credits', { uid: target.id, amount: bonus, why: 'wk-course-bonus' }); } catch (e) { bonus = 0; }
        }
      }
      try {
        await db.from('payments').insert({ user_id: target.id, reference: 'course-' + Date.now() + '-' + email, amount_naira: 0, pack: course, credits_added: bonus, status: 'manual' });
      } catch (e) {}
      return json(200, { ok: true, email: target.email, course, credits: bonus, granted: 'course' });
    }

    // Credits: exact custom amount, OR the pack's credits doubled (founding).
    const credits = custom > 0 ? custom : pack.credits * FOUNDING_MULTIPLIER;
    const doubled = custom <= 0 && FOUNDING_MULTIPLIER > 1;

    await db.rpc('add_credits', { uid: target.id, amount: credits, why: custom > 0 ? 'manual_topup' : 'manual_grant' });

    // Apply plan only when a subscription/course pack was chosen.
    if (pack && (pack.kind === 'sub' || pack.kind === 'course')) {
      const plan = pack.plan || 'pro';
      const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      await db.from('profiles').update({ plan, plan_expires_at: expires }).eq('id', target.id);
    }
    // Best-effort: mark them a founding member (ignore if the column doesn't exist).
    try { await db.from('profiles').update({ founding_2x: true }).eq('id', target.id); } catch (e) {}

    try {
      await db.from('payments').insert({
        user_id: target.id, reference: 'manual-' + Date.now() + '-' + email,
        amount_naira: pack ? pack.amount_naira : 0, pack: body.pack || 'custom', credits_added: credits, status: 'manual',
      });
    } catch (e) {}

    return json(200, { ok: true, email: target.email, credits, founding: doubled, plan: pack ? (pack.plan || pack.kind) : 'top-up' });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Grant failed — try again.' });
  }
};
