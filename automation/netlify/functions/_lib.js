// Shared helpers used by every Fuse Auto function. Keeping this in one place
// means the "Check my setup" / "Test a comment" diagnostic tools can never
// drift out of sync with what the real webhook actually does.
const DEFAULT_DM =
`Here it is 👇

1️⃣ Open Fuse Studio → https://fuse-studio.netlify.app
2️⃣ Sign up free (you get free credits to start)
3️⃣ Go to "Viral Presets" → tap the exact video you saw on my page
4️⃣ Everything's pre-loaded — the prompts, the look, the steps. Just follow it and make your own 🎬

🔥 First 50 people get DOUBLE credits — don't sleep on it.
Make yours and tag me @fuse_studio2!`;

const DEFAULT_REPLIES = ['Just sent it 📩 check your DMs!', "Sent! It's in your messages 👀", 'On its way to your DMs 🔥'];

async function store() {
  const { getStore } = await import('@netlify/blobs');
  // Netlify's automatic Blobs context occasionally fails to attach to a function
  // invocation (a known platform quirk -> MissingBlobsEnvironmentError). Fall back
  // to explicit config using the auto-injected SITE_ID + a manual access token.
  const siteID = process.env.SITE_ID || process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) return getStore({ name: 'fuse-auto', siteID, token });
  return getStore('fuse-auto');
}

function normalizeRules(arr) {
  return arr.map((r, i) => ({
    id: r.id || `r${i}`,
    name: r.name || '',
    media_id: r.media_id ? String(r.media_id) : '',
    keywords: (r.keywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean),
    // An explicit empty array means "no public reply" (the dashboard's toggle is off) —
    // only fall back to the default replies when the key is missing entirely (legacy rules).
    replies: (Array.isArray(r.replies) ? r.replies : DEFAULT_REPLIES).map((s) => String(s).trim()).filter(Boolean),
    dm: r.dm || DEFAULT_DM,
    askFollow: !!r.askFollow,
    openDm: r.openDm || '',
    followDm: r.followDm || '',
    buttons: Array.isArray(r.buttons) ? r.buttons.filter((b) => b && b.url).slice(0, 3) : [],
    reminderDm: r.reminderDm || '',
    reminderMinutes: r.reminderMinutes ? Number(r.reminderMinutes) : 60,
  }));
}

// Build the list of automations from env. Prefer FUSE_AUTOMATIONS (multi-post),
// fall back to the old single KEYWORDS/DM_TEXT pair so existing setups keep working.
function loadAutomationsFromEnv() {
  const raw = (process.env.FUSE_AUTOMATIONS || '').trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return normalizeRules(arr);
    } catch (e) { /* fall through to single mode */ }
  }
  return [{
    id: 'default',
    name: 'default',
    media_id: '',
    keywords: (process.env.KEYWORDS || 'PROMPT,prompt,Prompt,PROMPTS').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    replies: (process.env.PUBLIC_REPLIES ? process.env.PUBLIC_REPLIES.split('|') : DEFAULT_REPLIES).map((s) => s.trim()).filter(Boolean),
    dm: process.env.DM_TEXT || DEFAULT_DM,
    askFollow: false, openDm: '', followDm: '', buttons: [], reminderDm: '', reminderMinutes: 60,
  }];
}

// Where do the token + automations come from? Prefer the one-tap "Connect Instagram"
// store; fall back to the manual env-var setup so older setups keep working.
async function loadEverything() {
  let token = process.env.IG_ACCESS_TOKEN || '';
  let igId = process.env.IG_USER_ID || '';
  let conn = null;
  let rules = null;
  try {
    const s = await store();
    conn = await s.get('conn', { type: 'json' });
    if (conn && conn.token) { token = conn.token; igId = conn.userId || igId; }
    const saved = await s.get('automations', { type: 'json' });
    if (Array.isArray(saved) && saved.length) rules = normalizeRules(saved);
  } catch (e) { /* blobs unavailable -> env fallback */ }
  if (!rules) rules = loadAutomationsFromEnv();
  return { token, igId, rules, conn };
}

// Pick the best automation for a comment. A rule locked to this post (media_id)
// wins over a global rule; within that, a keyword must match (unless the rule has
// no keywords, meaning "any comment on this post").
function matchAutomation(rules, text, mediaId) {
  const kwHit = (r) => r.keywords.length === 0 || r.keywords.some((k) => text.includes(k));
  let r = rules.find((x) => x.media_id && mediaId && x.media_id === mediaId && kwHit(x));
  if (r) return r;
  r = rules.find((x) => !x.media_id && x.keywords.length && kwHit(x));
  if (r) return r;
  return rules.find((x) => !x.media_id && x.keywords.length === 0) || null;
}

module.exports = { DEFAULT_DM, DEFAULT_REPLIES, store, normalizeRules, loadAutomationsFromEnv, loadEverything, matchAutomation };
