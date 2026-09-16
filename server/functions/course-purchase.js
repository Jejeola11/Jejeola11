// ============================================================
// POST /api/course-purchase
// Body: { course: 'design'|'video'|'landing'|'money'|'all' }
//
// Purchases Academy access with the signed-in user's existing Fuse credits.
// The database RPC performs the deduction + unlock grant + ledger write
// atomically, so a failed request can never charge credits without granting
// access (or grant access without charging).
// ============================================================
const { admin, getUser, json } = require('./_supabase');

const COURSE_META = {
  design: { label: 'Design & Flyers', credits: 115 },
  video: { label: 'AI UGC & Influencer', credits: 115 },
  landing: { label: 'Landing Page Design', credits: 80 },
  money: { label: 'Money Engine', credits: 80 },
  all: { label: 'All remaining courses', credits: 280 },
};

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body = {};
    try { body = JSON.parse(event.body || '{}'); }
    catch (_) { return json(400, { error: 'Bad request.' }); }

    const course = String(body.course || '').trim().toLowerCase();
    if (!COURSE_META[course]) return json(400, { error: 'Choose a valid course.' });

    const db = admin();
    const { data, error } = await db.rpc('purchase_course_unlock', {
      p_user_id: user.id,
      p_course: course,
    });
    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Course purchase could not be completed.');

    return json(200, {
      ok: row.status === 'success' || row.status === 'already_owned',
      status: row.status,
      course,
      label: COURSE_META[course].label,
      balance: Number(row.balance || 0),
      credits_spent: Number(row.credits_spent || 0),
      unlocked_courses: Array.isArray(row.unlocked_courses) ? row.unlocked_courses : [],
    });
  } catch (e) {
    console.error('course-purchase failed', e);
    return json(500, { error: (e && e.message) || 'Could not unlock this course.' });
  }
};
