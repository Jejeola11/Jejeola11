// ============================================================
// POST /.netlify/functions/unlock-module
// Body: { module_key }. Spends credits to unlock one course module.
// Course buyers / Pro / Agency / admin already have everything (checked client-side
// and here we still let them unlock for free). Cost is config-driven below.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');

const MODULE_COST = 100; // credits to unlock one Atelier module
// Per-key credit price overrides (server-controlled). 'wk-course' = The $500 Week.
const KEY_COST = { 'wk-course': 900 };
function costFor(key) { return KEY_COST[key] || MODULE_COST; }

exports.handler = async (event) => {
  let db, user;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const module_key = (body.module_key || '').trim();
    if (!module_key) return json(400, { error: 'Missing module_key' });
    const cost = costFor(module_key);

    db = admin();

    // Already unlocked? Don't charge twice.
    const { data: existing } = await db.from('module_unlocks').select('module_key').eq('user_id', user.id).eq('module_key', module_key).maybeSingle();
    if (existing) return json(200, { ok: true, already: true });

    // Full-access plans unlock for free.
    let plan = 'free', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    const fullAccess = isAdmin || ['pro', 'agency'].includes(plan);

    // Selar access code: a buyer who paid on Selar redeems the code you give them
    // (set WEEK_CODE env var; defaults to 'UGC500'). Valid code = free grant, no credits.
    const codeGiven = (body.code || '').trim();
    let byCode = false;
    if (module_key === 'wk-course' && codeGiven) {
      const valid = (process.env.WEEK_CODE || 'UGC500').trim();
      if (codeGiven.toLowerCase() === valid.toLowerCase()) byCode = true;
      else return json(403, { error: 'That code is not valid.', code: 'BAD_CODE' });
    }

    let credits = null;
    if (!fullAccess && !byCode) {
      const { data: bal } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
      if (bal === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });
      credits = bal;
    }

    await db.from('module_unlocks').insert({ user_id: user.id, module_key });
    return json(200, { ok: true, credits, cost: (fullAccess || byCode) ? 0 : cost, byCode });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not unlock module.' });
  }
};
