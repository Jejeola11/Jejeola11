// ============================================================
// POST /.netlify/functions/lesson-video   (Fuse Atelier course player)
// Body: { lesson_key }
// The only path that returns a real, playable lesson video URL. Before
// phase 25, course_videos.url was publicly SELECT-able (RLS `using(true)`),
// so the app's tier gate (moduleUnlocked() in app.js) was UI-level hiding
// only -- anyone with the public anon key could read every lesson's URL
// straight from the table regardless of payment. That column is now
// revoked from anon/authenticated (see supabase/schema-phase25.sql); this
// function, using the service-role key, is the sole remaining source.
//
// Re-derives the exact same access decision app.js's atelierTier() /
// moduleUnlocked() make client-side, using _lesson-access.js -- a static
// map generated from app/course.js (see scripts/gen-lesson-access.js).
// Regenerate that map any time course.js's pillars/tiers/lessons change,
// or a lesson added there will 404 here even though the UI shows it.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const LESSON_ACCESS = require('./_lesson-access');

// Academy V2 keeps the Money Engine path locally in academy/index.html
// rather than inside app/course.js, so those current lesson keys are not
// generated into _lesson-access.js. Keep this list in sync with that local
// learner-facing MONEY object. It uses the same tier/access checks below.
const MONEY_ACCESS = {
  'money-start': { tier: 1, module: 'money' },
  'money-m1': { tier: 1, module: 'money' },
  'money-m2': { tier: 1, module: 'money' },
  'money-m3': { tier: 1, module: 'money' },
  'money-m4': { tier: 1, module: 'money' },
  'money-m5': { tier: 1, module: 'money' },
  'money-m6': { tier: 1, module: 'money' },
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const lessonKey = (body.lesson_key || '').trim();
    if (!lessonKey) return json(400, { error: 'Missing lesson_key' });

    const access = LESSON_ACCESS[lessonKey] || MONEY_ACCESS[lessonKey];
    if (!access) return json(404, { error: 'Unknown lesson.' });

    const db = admin();

    if (access.tier > 0) {
      const { data: profile } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const isAdmin = !!(profile && profile.is_admin);
      if (!isAdmin) {
        const { data: unlocks } = await db.from('module_unlocks').select('module_key').eq('user_id', user.id);
        const owned = new Set((unlocks || []).map((r) => r.module_key));
        // Mirrors atelierTier(): legacy 'atelier-full' buyers count as Empire.
        const tier = (owned.has('atelier-empire') || owned.has('atelier-full')) ? 3
          : owned.has('atelier-creator') ? 2
          : owned.has('atelier-starter') ? 1 : 0;
        const allowed = tier >= access.tier || owned.has(access.module); // legacy per-module unlock fallback
        if (!allowed) return json(403, { error: 'Unlock this module first.', code: 'MODULE_LOCKED' });
      }
    }

    const { data: row } = await db.from('course_videos').select('url').eq('lesson_key', lessonKey).maybeSingle();
    if (!row || !row.url) return json(404, { error: 'Video coming soon.' });
    return json(200, { url: row.url });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not load video.' });
  }
};
