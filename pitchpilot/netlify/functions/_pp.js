// Shared helpers for PitchPilot functions — Supabase admin client, auth, usage.
// PitchPilot has its OWN Supabase project — fully separate from Fuse Studio,
// so public sign-ups here never touch or share Fuse Studio accounts. Set
// SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY on this Netlify site to THIS
// project's values (Settings → API in your new Supabase project).
const { createClient } = require('@supabase/supabase-js');

function admin() {
  let url = (process.env.SUPABASE_URL || '').trim();
  url = url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '').replace(/\/+$/, '');
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function getUser(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

// Fetch (or create with the 3 free uses) this user's usage row.
async function getUsage(db, uid) {
  const { data } = await db.from('pp_usage').select('*').eq('user_id', uid).maybeSingle();
  if (data) return data;
  const fresh = { user_id: uid, uses_left: 3, plan: 'free' };
  await db.from('pp_usage').insert(fresh);
  return fresh;
}

// Spend one use. Returns the new uses_left, or null if none left.
async function spendUse(db, uid) {
  const row = await getUsage(db, uid);
  if (row.uses_left <= 0) return null;
  const { data, error } = await db
    .from('pp_usage')
    .update({ uses_left: row.uses_left - 1, updated_at: new Date().toISOString() })
    .eq('user_id', uid)
    .eq('uses_left', row.uses_left) // optimistic lock: no double-spend on rapid taps
    .select('uses_left')
    .maybeSingle();
  if (error || !data) return null;
  return data.uses_left;
}

async function refundUse(db, uid) {
  try {
    const row = await getUsage(db, uid);
    await db.from('pp_usage').update({ uses_left: row.uses_left + 1 }).eq('user_id', uid);
  } catch (e) {}
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  body: JSON.stringify(body),
});

module.exports = { admin, getUser, getUsage, spendUse, refundUse, json };
