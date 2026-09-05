// ============================================================
// POST /.netlify/functions/lesson-video   (Fuse Atelier course player)
// Body: { lesson_key }
// Protected source of playable lesson-video URLs.
// ============================================================
const { createClient } = require('@supabase/supabase-js');
const LESSON_ACCESS = require('./_lesson-access');

const MONEY_ACCESS = {
  'money-start': { tier: 1, module: 'money' },
  'money-m1': { tier: 1, module: 'money' },
  'money-m2': { tier: 1, module: 'money' },
  'money-m3': { tier: 1, module: 'money' },
  'money-m4': { tier: 1, module: 'money' },
  'money-m5': { tier: 1, module: 'money' },
  'money-m6': { tier: 1, module: 'money' },
};

const CURRENT_ACADEMY_ACCESS = {
  'aiv-5_1': { tier: 1, module: 'aiv-m5' },
  'aiv-6_1': { tier: 1, module: 'aiv-m6' },
  'aiv-7_1': { tier: 1, module: 'aiv-m7' },
  'aiv-8_1': { tier: 1, module: 'aiv-m8' },
  'aiv-8_2': { tier: 1, module: 'aiv-m8' },
  'aiv-9_1': { tier: 1, module: 'aiv-m9' },
  'aiv-10_1': { tier: 1, module: 'aiv-m10' },
  'aiv-11_1': { tier: 1, module: 'aiv-m11' },
  'aiv-12_1': { tier: 1, module: 'aiv-m12' },
  'aiv-13_1': { tier: 1, module: 'aiv-m13' },
  'aiv-14_1': { tier: 1, module: 'aiv-m14' },
  'aiv-15_1': { tier: 1, module: 'aiv-m15' },
  'aiv-16_1': { tier: 1, module: 'aiv-m16' },
  'web-2_1': { tier: 1, module: 'web-m2' },
  'web-3_1-current': { tier: 1, module: 'web-m3-current' },
  'web-4_1': { tier: 1, module: 'web-m4' },
  'web-5_1': { tier: 1, module: 'web-m5' },
  'web-6_1': { tier: 1, module: 'web-m6' },
  'web-7_1': { tier: 1, module: 'web-m7' },
  'web-8_1': { tier: 1, module: 'web-m8' },
  'web-9_1': { tier: 1, module: 'web-m9' },
  'web-10_1': { tier: 1, module: 'web-m10' },
};

function env(name) {
  try {
    if (globalThis.Netlify && globalThis.Netlify.env && typeof globalThis.Netlify.env.get === 'function') {
      const value = globalThis.Netlify.env.get(name);
      if (value) return String(value).trim();
    }
  } catch (_) {}
  return String(process.env[name] || '').trim();
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

function bearer(event) {
  const raw = event.headers.authorization || event.headers.Authorization || '';
  return raw.replace(/^Bearer\s+/i, '').trim();
}

function scopedClient(token) {
  let url = env('SUPABASE_URL').replace(/\/+$/, '').replace(/\/rest\/v1$/, '').replace(/\/+$/, '');
  const key = env('SUPABASE_ANON_KEY') || env('SUPABASE_PUBLISHABLE_KEY');
  if (!url) throw new Error('Supabase URL is not configured.');
  if (!key) throw new Error('Supabase public key is not configured.');
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const token = bearer(event);
    if (!token) return json(401, { error: 'Please sign in again.' });

    const db = scopedClient(token);
    const { data: authData, error: authError } = await db.auth.getUser(token);
    const user = authData && authData.user;
    if (authError || !user) return json(401, { error: 'Please sign in again.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (_) { return json(400, { error: 'Bad request' }); }

    const lessonKey = String(body.lesson_key || '').trim();
    if (!lessonKey) return json(400, { error: 'Missing lesson_key' });

    const access = CURRENT_ACADEMY_ACCESS[lessonKey] || LESSON_ACCESS[lessonKey] || MONEY_ACCESS[lessonKey];
    if (!access) return json(404, { error: 'Unknown lesson.' });

    if (access.tier > 0) {
      const { data: profile, error: profileError } = await db
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      const isAdmin = !!(profile && profile.is_admin);
      if (!isAdmin) {
        const { data: unlocks, error: unlockError } = await db
          .from('module_unlocks')
          .select('module_key')
          .eq('user_id', user.id);
        if (unlockError) throw unlockError;

        const owned = new Set((unlocks || []).map((r) => r.module_key));
        const tier = (owned.has('atelier-empire') || owned.has('atelier-full')) ? 3
          : owned.has('atelier-creator') ? 2
          : owned.has('atelier-starter') ? 1 : 0;
        const allowed = tier >= access.tier || owned.has(access.module);
        if (!allowed) return json(403, { error: 'Unlock this module first.', code: 'MODULE_LOCKED' });
      }
    }

    const { data: row, error: videoError } = await db
      .from('course_videos')
      .select('url, has_video')
      .eq('lesson_key', lessonKey)
      .maybeSingle();
    if (videoError) throw videoError;
    if (!row || !row.url || row.has_video === false) return json(404, { error: 'Video coming soon.' });

    return json(200, { url: row.url });
  } catch (e) {
    console.error('lesson-video failed', e);
    return json(500, { error: (e && e.message) || 'Could not load video.' });
  }
};
