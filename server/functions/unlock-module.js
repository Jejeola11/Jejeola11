// ============================================================
// POST /.netlify/functions/unlock-module
// Body: { module_key, code? }. Unlocks one course module either by spending
// credits, by a valid Selar redemption code, or (admin only) for free.
// Courses are purchase-only — a Pro/Agency image-credit plan does NOT grant
// free course access. Cost/codes are config-driven below.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');

const MODULE_COST = 100; // credits to unlock one Atelier module
// Per-key credit price overrides (server-controlled). 'wk-course' = The $500 Week
// (whole course); 'wk-1'..'wk-7' = single $500 Week days, unlockable one at a time.
// 'mini-*' = the ₦1,000 one-video Mini Masterclasses sold via Selar/WhatsApp.
const KEY_COST = {
  'wk-course': 250, // ~ same value as the ₦5,000 course price
  'wk-1': 50, 'wk-2': 50, 'wk-3': 50, 'wk-4': 50, 'wk-5': 50, 'wk-6': 50, 'wk-7': 50,
  'mini-avatar': 30, 'mini-talkinghead': 30, 'mini-productad': 30, 'mini-movie': 30,
  'mini-socialdesign': 30, 'mini-packaging': 30, 'mini-ugc': 30, 'mini-cgi': 30,
  'mini-motion': 30, 'mini-logo': 30,
};
// Buying the full $500 Week course comes with a 100-credit creation bonus —
// that's the "free credits to create with" promise, for buyers only (the
// normal signup trial stays at 12).
const WK_COURSE_BONUS = 100;
function costFor(key) { return KEY_COST[key] || MODULE_COST; }

// Selar access codes, one per redeemable key. Give the buyer their key's code
// after payment — set real values via the MODULE_CODES env var (JSON, e.g.
// {"wk-course":"UGC500","mini-avatar":"AVATAR1K"}) once live; these are just
// safe defaults so redemption works before you've configured Netlify env vars.
const DEFAULT_CODES = {
  'wk-course': 'UGC500',
  'mini-avatar': 'AVATAR1K', 'mini-talkinghead': 'TALK1K', 'mini-productad': 'PRODUCTAD1K',
  'mini-movie': 'MOVIE1K', 'mini-socialdesign': 'SOCIAL1K', 'mini-packaging': 'PACK1K',
  'mini-ugc': 'UGC1K', 'mini-cgi': 'CGI1K', 'mini-motion': 'MOTION1K', 'mini-logo': 'LOGO1K',
};
function codeFor(key) {
  try {
    const overrides = JSON.parse(process.env.MODULE_CODES || '{}');
    if (overrides[key]) return overrides[key];
  } catch (e) {}
  return DEFAULT_CODES[key] || null;
}

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

    // Courses are purchase-only — image/video credit plans (Pro/Agency) do NOT
    // grant course access for free. Only admin (testing) bypasses payment.
    let isAdmin = false;
    try { const p = await getPlan(user.id); isAdmin = p.isAdmin; } catch (e) {}
    const fullAccess = isAdmin;

    // Selar access code: a buyer who paid on Selar redeems the code you give them.
    // Valid code = free grant, no credits. Works for wk-course and every mini-* key.
    const codeGiven = (body.code || '').trim();
    let byCode = false;
    if (codeGiven) {
      const valid = codeFor(module_key);
      if (valid && codeGiven.toLowerCase() === valid.toLowerCase()) byCode = true;
      else return json(403, { error: 'That code is not valid.', code: 'BAD_CODE' });
    }

    let credits = null;
    if (!fullAccess && !byCode) {
      const { data: bal } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
      if (bal === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });
      credits = bal;
    }

    await db.from('module_unlocks').insert({ user_id: user.id, module_key });

    // Full-course buyers get the 100-credit creation bonus (however they unlocked).
    if (module_key === 'wk-course') {
      try { const { data: nb } = await db.rpc('add_credits', { uid: user.id, amount: WK_COURSE_BONUS, why: 'wk-course-bonus' }); if (nb !== null && nb !== undefined) credits = nb; } catch (e) {}
    }
    return json(200, { ok: true, credits, cost: (fullAccess || byCode) ? 0 : cost, byCode, bonus: module_key === 'wk-course' ? WK_COURSE_BONUS : 0 });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not unlock module.' });
  }
};
