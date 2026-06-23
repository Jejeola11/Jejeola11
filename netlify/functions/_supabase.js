// Shared Supabase admin client + auth helper for Netlify Functions.
const { createClient } = require('@supabase/supabase-js');

// Service-role client: full DB access, server-only. Never expose this key.
function admin() {
  // Be forgiving if SUPABASE_URL was pasted with a trailing slash or /rest/v1.
  let url = (process.env.SUPABASE_URL || '').trim();
  url = url.replace(/\/+$/, '').replace(/\/rest\/v1$/, '').replace(/\/+$/, '');
  return createClient(
    url,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Validate the caller's Supabase access token (sent as Bearer) and return the user.
async function getUser(event) {
  const auth = event.headers.authorization || event.headers.Authorization || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin().auth.getUser(token);
  if (error || !data || !data.user) return null;
  return data.user;
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

module.exports = { admin, getUser, json };
