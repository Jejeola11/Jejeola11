// ============================================================
// POST /.netlify/functions/lesson-video   (Fuse Atelier course player)
// Body: { lesson_key }
// Protected source of playable lesson-video URLs.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
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

// Current Academy V2 curriculum additions. app/course.js still contains
// legacy/older course definitions, while Academy V2 applies the launch
// curriculum from atelier-v2/academy/course-current.js. Keep the protected
// video endpoint aware of every current learner-facing lesson key.
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

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) { return json(400, { error: 'Bad request' }); }

    const lessonKey = (body.lesson_key || '').trim();
    if (!lessonKey) return json(400, { error: 'Missing lesson_key' });

    const access = CURRENT_ACADEMY_ACCESS[lessonKey] || LESSON_ACCESS[lessonKey] || MONEY_ACCESS[lessonKey];
    if (!access) return json(404, { error: 'Unknown lesson.' });

    const db = admin();
    if (access.tier > 0) {
      const { data: profile } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
      const isAdmin = !!(profile && profile.is_admin);
      if (!isAdmin) {
        const { data: unlocks } = await db.from('module_unlocks').select('module_key').eq('user_id', user.id);
        const owned = new Set((unlocks || []).map((r) => r.module_key));
        const tier = (owned.has('atelier-empire') || owned.has('atelier-full')) ? 3
          : owned.has('atelier-creator') ? 2
          : owned.has('atelier-starter') ? 1 : 0;
        const allowed = tier >= access.tier || owned.has(access.module);
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
