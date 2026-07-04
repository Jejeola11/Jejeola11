// ============================================================
// POST /.netlify/functions/pp-grant   (admin only — Ria)
// Body: { email, plan }  where plan = 'starter' | 'pro' | 'agency' | 'free5'
// Sets a buyer's plan + tops up their pitch allowance after they pay you.
// Authorised by the CALLER being a Fuse admin (profiles.is_admin) — same
// Supabase project, so your Fuse Studio admin account works here too.
// ============================================================
const { admin, getUser, json } = require('./_pp');

const PLANS = {
  starter: { uses: 100, days: 30 },   // ₦5,000/mo
  pro:     { uses: 300, days: 30 },   // ₦12,000/mo
  agency:  { uses: 1000, days: 30 },  // ₦25,000/mo
  free5:   { uses: 5, days: 0 },      // reset someone to the free trial
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Sign in first.' });

    const db = admin();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const email = (body.email || '').trim();
    const plan = PLANS[body.plan] ? body.plan : null;
    if (!email || !plan) return json(400, { error: 'Need email + a valid plan (starter/pro/agency/free5).' });

    const { data: rows } = await db.from('profiles').select('id, email').ilike('email', email).limit(1);
    const target = rows && rows[0];
    if (!target) return json(404, { error: 'No account with that email — ask them to sign up on PitchPilot first.' });

    const p = PLANS[plan];
    const expires = p.days ? new Date(Date.now() + p.days * 24 * 60 * 60 * 1000).toISOString() : null;
    await db.from('pp_usage').upsert({
      user_id: target.id,
      uses_left: p.uses,
      plan: plan === 'free5' ? 'free' : plan,
      plan_expires_at: expires,
      updated_at: new Date().toISOString(),
    });
    return json(200, { ok: true, email: target.email, plan, uses: p.uses });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Grant failed' });
  }
};
