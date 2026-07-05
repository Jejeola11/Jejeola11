// ============================================================
// POST /.netlify/functions/pp-grant   (admin only — Ria)
// Body: { email, plan }  where plan = 'starter' | 'pro' | 'agency' | 'free3'
// Sets a buyer's plan + tops up their pitch allowance after they pay you.
// Authorised by the CALLER's email matching PP_ADMIN_EMAILS (comma-separated
// env var on this Netlify site) — PitchPilot has its OWN Supabase project now,
// fully separate from Fuse Studio, so there's no shared admin table to check.
// ============================================================
const { admin, getUser, json } = require('./_pp');

const PLANS = {
  starter: { uses: 30, days: 30 },    // ₦1,000/mo
  pro:     { uses: 100, days: 30 },   // ₦3,000/mo
  agency:  { uses: 300, days: 30 },   // ₦7,000/mo
  free3:   { uses: 3, days: 0 },      // reset someone to the free trial
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Sign in first.' });

    const adminEmails = (process.env.PP_ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (!adminEmails.includes((user.email || '').toLowerCase())) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const email = (body.email || '').trim();
    const plan = PLANS[body.plan] ? body.plan : null;
    if (!email || !plan) return json(400, { error: 'Need email + a valid plan (starter/pro/agency/free3).' });

    const db = admin();
    // No shared profiles table anymore — look the buyer up directly in Auth.
    let target = null, page = 1;
    while (!target && page <= 20) {
      const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (error) break;
      target = (data.users || []).find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
      if (!data.users || data.users.length < 200) break;
      page++;
    }
    if (!target) return json(404, { error: 'No account with that email — ask them to sign up on PitchPilot first.' });

    const p = PLANS[plan];
    const expires = p.days ? new Date(Date.now() + p.days * 24 * 60 * 60 * 1000).toISOString() : null;
    await db.from('pp_usage').upsert({
      user_id: target.id,
      uses_left: p.uses,
      plan: plan === 'free3' ? 'free' : plan,
      plan_expires_at: expires,
      updated_at: new Date().toISOString(),
    });
    return json(200, { ok: true, email: target.email, plan, uses: p.uses });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Grant failed' });
  }
};
