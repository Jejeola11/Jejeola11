// GET /.netlify/functions/health — diagnostic. Shows which env vars are set and
// whether the server can reach Supabase. Reveals NO secret values. Visit:
//   https://YOUR-SITE.netlify.app/.netlify/functions/health
const { admin, json } = require('./_supabase');

exports.handler = async () => {
  const env = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    MUAPI_KEY: !!process.env.MUAPI_KEY,
    APP_URL: !!process.env.APP_URL,
    PAYSTACK_SECRET_KEY: !!process.env.PAYSTACK_SECRET_KEY,
  };

  let url_host = null;
  try { url_host = new URL(process.env.SUPABASE_URL).host; } catch (e) {}

  // Can the server actually talk to Supabase with the service role key?
  let supabase_ok = false, supabase_error = null;
  try {
    const { error } = await admin().from('profiles').select('id').limit(1);
    supabase_ok = !error;
    if (error) supabase_error = error.message;
  } catch (e) { supabase_error = e.message; }

  return json(200, {
    ok: env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY && env.MUAPI_KEY && supabase_ok,
    env, url_host, supabase_ok, supabase_error,
    hint: 'All env booleans should be true and supabase_ok must be true. url_host must match your Supabase project.',
  });
};
