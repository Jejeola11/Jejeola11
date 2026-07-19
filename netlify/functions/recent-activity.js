// ============================================================
// GET /.netlify/functions/recent-activity   (public, no auth)
// Powers the landing page's "recent activity" popup. Returns REAL recent
// Fuse Atelier enrollments only -- never fabricated or randomized. The
// landing page's own Proof Wall already promises "No fake alerts", so this
// has to hold to the same standard: real payments rows, real timestamps,
// nothing shown if there's no genuinely recent activity to report.
//
// "Real" here includes both status='success' (automated Paystack) and
// status='manual' (Ria personally confirmed a bank transfer) -- both are
// genuine completed enrollments, just fulfilled through different rails.
// Only Atelier course packs are included (not studio credit top-ups),
// since that's the specific offer this page sells.
// ============================================================
const { admin, json } = require('./_supabase');

const ATELIER_PACKS = {
  atelier_starter: 'Fuse Atelier — Starter',
  atelier_creator: 'Fuse Atelier — Creator',
  atelier_empire: 'Fuse Atelier — Empire',
  'atelier-full': 'Fuse Atelier',
  course: 'Fuse Atelier',
};
const MAX_AGE_DAYS = 30;
const LIMIT = 10;

// Best-effort, honest display name from a real email -- never invented.
// Falls back to an anonymous phrase when the local-part doesn't look like
// a name (mostly digits/symbols), rather than showing something odd.
function nameFromEmail(email) {
  const local = (email || '').split('@')[0].replace(/[0-9_.\-+]+/g, ' ').trim();
  const first = local.split(/\s+/)[0];
  if (!first || first.length < 2) return null;
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

exports.handler = async () => {
  try {
    const db = admin();
    const since = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const { data: rows } = await db.from('payments')
      .select('user_id, pack, status, created_at')
      .in('status', ['success', 'manual'])
      .in('pack', Object.keys(ATELIER_PACKS))
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(LIMIT);

    if (!rows || !rows.length) return json(200, { activities: [] });

    const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];
    const { data: profiles } = await db.from('profiles').select('id, email').in('id', userIds);
    const emailById = new Map((profiles || []).map((p) => [p.id, p.email]));

    const activities = rows.map((r) => {
      const name = nameFromEmail(emailById.get(r.user_id));
      return {
        text: name ? `${name} just enrolled in` : 'Someone just enrolled in',
        product: ATELIER_PACKS[r.pack] || 'Fuse Atelier',
        when: timeAgo(r.created_at),
      };
    });

    return json(200, { activities });
  } catch (e) {
    return json(200, { activities: [] }); // fail silent -- this is decorative, never block the page
  }
};
