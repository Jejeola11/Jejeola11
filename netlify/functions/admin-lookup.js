// ============================================================
// POST /.netlify/functions/admin-lookup   (owner/admin only)
// Body: { email }. Read-only — shows exactly what a buyer's account
// currently has: plan, credits, admin flag, and every course/module
// they've been unlocked for. Companion to admin-grant/admin-revoke so
// a grant can actually be verified instead of assumed.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    const db = admin();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const email = (body.email || '').trim();
    if (!email) return json(400, { error: 'Enter an email.' });

    const { data: rows } = await db.from('profiles').select('id, email, plan, plan_expires_at, credits, is_admin').ilike('email', email).limit(1);
    const target = rows && rows[0];
    if (!target) return json(404, { error: 'No account with that email yet.' });

    const { data: unlocks } = await db.from('module_unlocks').select('module_key, created_at').eq('user_id', target.id).order('created_at', { ascending: true });

    return json(200, {
      ok: true,
      email: target.email,
      plan: target.plan,
      plan_expires_at: target.plan_expires_at,
      credits: target.credits,
      is_admin: target.is_admin,
      unlocks: (unlocks || []).map((r) => r.module_key),
    });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Lookup failed — try again.' });
  }
};
