// ============================================================
// Fuse Auto — your own ManyChat. Instagram comment -> auto public reply + DM.
// Handles UNLIMITED posts: each post can have its own keyword + DM ("automation").
//
// 3-step ManyChat-style follow gate (Instagram's API cannot verify a real
// follow for an arbitrary commenter — no automation tool can. This matches
// ManyChat's own honor-system flow exactly):
//   1) Opening DM   — sent the moment they comment. Button: "Send me the LINK"
//   2) Follow-ask DM — sent when they tap that. Button: "I've followed, send it"
//   3) Link DM      — sent when they tap that. The real link + buttons.
// Optional reminder DM if they go quiet at either step.
//
//   GET  : Meta webhook verification (hub.challenge)
//   POST : comment events  -> match a rule -> public reply + opening/link DM
//          messaging events -> button taps -> advance to the next step
//
// Env vars (only needed as a fallback if you didn't use "Connect Instagram"):
//   VERIFY_TOKEN, IG_USER_ID, IG_ACCESS_TOKEN, FUSE_AUTOMATIONS, KEYWORDS, DM_TEXT, PUBLIC_REPLIES
// ============================================================
const GRAPH = 'https://graph.instagram.com/v21.0';

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
  return getStore('fuse-auto');
}

function normalizeRules(arr) {
  return arr.map((r, i) => ({
    id: r.id || `r${i}`,
    name: r.name || '',
    media_id: r.media_id ? String(r.media_id) : '',
    keywords: (r.keywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean),
    replies: (r.replies && r.replies.length ? r.replies : DEFAULT_REPLIES).map((s) => String(s).trim()).filter(Boolean),
    dm: r.dm || DEFAULT_DM,
    askFollow: !!r.askFollow,
    openDm: r.openDm || '',
    followDm: r.followDm || '',
    buttons: Array.isArray(r.buttons) ? r.buttons.filter((b) => b && b.url).slice(0, 3) : [],
    reminderDm: r.reminderDm || '',
    reminderMinutes: r.reminderMinutes ? Number(r.reminderMinutes) : 60,
  }));
}

// Where do the token + automations come from? Prefer the one-tap "Connect Instagram"
// store; fall back to the manual env-var setup so older setups keep working.
async function loadEverything() {
  let token = process.env.IG_ACCESS_TOKEN || '';
  let igId = process.env.IG_USER_ID || '';
  let rules = null;
  try {
    const s = await store();
    const conn = await s.get('conn', { type: 'json' });
    if (conn && conn.token) { token = conn.token; igId = conn.userId || igId; }
    const saved = await s.get('automations', { type: 'json' });
    if (Array.isArray(saved) && saved.length) rules = normalizeRules(saved);
  } catch (e) { /* blobs unavailable -> env fallback */ }
  if (!rules) rules = loadAutomations();
  return { token, igId, rules };
}

// Build the list of automations from env. Prefer FUSE_AUTOMATIONS (multi-post),
// fall back to the old single KEYWORDS/DM_TEXT pair so existing setups keep working.
function loadAutomations() {
  const raw = (process.env.FUSE_AUTOMATIONS || '').trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) return normalizeRules(arr);
    } catch (e) { /* fall through to single mode */ }
  }
  // single-automation fallback
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

// ---- message builders ----
function linkMessage(rule) {
  if (rule.buttons && rule.buttons.length) {
    return { attachment: { type: 'template', payload: { template_type: 'button', text: String(rule.dm || DEFAULT_DM).slice(0, 640), buttons: rule.buttons.map((b) => ({ type: 'web_url', url: b.url, title: (b.title || 'Open').slice(0, 20) })) } } };
  }
  return { text: rule.dm || DEFAULT_DM };
}
function openMessage(rule) {
  return { attachment: { type: 'template', payload: { template_type: 'button', text: String(rule.openDm || '').slice(0, 640), buttons: [{ type: 'postback', title: 'Send me the LINK', payload: `WANT_LINK:${rule.id}` }] } } };
}
function followAskMessage(rule) {
  return { attachment: { type: 'template', payload: { template_type: 'button', text: String(rule.followDm || '').slice(0, 640), buttons: [{ type: 'postback', title: "I've followed, send it", payload: `CONFIRM_FOLLOW:${rule.id}` }] } } };
}
async function sendMessage(igId, token, recipient, message) {
  return safeJson(fetch(`${GRAPH}/${igId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, message, access_token: token }),
  }));
}
async function safeJson(p) { try { const r = await p; return await r.json(); } catch (e) { return null; } }
async function safe(p) { try { return await p; } catch (e) { return null; } }
async function setPending(psid, patch) {
  try {
    const s = await store();
    const pending = (await s.get('pending', { type: 'json' })) || {};
    pending[psid] = { ...(pending[psid] || {}), ...patch };
    await s.setJSON('pending', pending);
  } catch (e) { /* reminder just won't fire — buttons still work */ }
}

exports.handler = async (event) => {
  // ---- Webhook verification (Meta calls this once when you subscribe) ----
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.VERIFY_TOKEN) {
      return { statusCode: 200, body: q['hub.challenge'] || '' };
    }
    return { statusCode: 403, body: 'verification failed' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'method' };

  // Always 200 fast; do the work but never throw back to Meta.
  try {
    const body = JSON.parse(event.body || '{}');
    const { token, igId, rules } = await loadEverything();
    if (!token || !igId || body.object !== 'instagram') return { statusCode: 200, body: 'EVENT_RECEIVED' };

    for (const entry of (body.entry || [])) {
      // ----- new comments -----
      for (const ch of (entry.changes || [])) {
        if (ch.field !== 'comments') continue;
        const v = ch.value || {};
        const text = (v.text || '').toLowerCase();
        const commentId = v.id;
        const mediaId = v.media && v.media.id ? String(v.media.id) : '';
        if (v.from && String(v.from.id) === String(igId)) continue; // skip our own comments
        if (!commentId) continue;

        const rule = matchAutomation(rules, text, mediaId);
        if (!rule) continue;

        if (rule.replies.length) {
          const reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
          await safe(fetch(`${GRAPH}/${commentId}/replies`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: reply, access_token: token }),
          }));
        }

        let resp, stage;
        if (rule.askFollow && rule.openDm) {
          // Step 1 of 3: opening DM with "Send me the LINK".
          resp = await sendMessage(igId, token, { comment_id: commentId }, openMessage(rule));
          stage = 'opened';
        } else if (rule.askFollow && rule.followDm) {
          // Legacy 2-step (no opening message configured): go straight to the follow-ask.
          resp = await sendMessage(igId, token, { comment_id: commentId }, followAskMessage(rule));
          stage = 'asked_follow';
        } else {
          await sendMessage(igId, token, { comment_id: commentId }, linkMessage(rule));
          continue;
        }
        const psid = resp && (resp.recipient_id || (resp.recipient && resp.recipient.id));
        if (psid) await setPending(psid, { ruleId: rule.id, stage, sentAt: Date.now(), completed: false, reminded: false });
      }

      // ----- button taps (advance to the next step) -----
      for (const m of (entry.messaging || [])) {
        const payload = m.postback && m.postback.payload;
        if (!payload) continue;
        const sep = payload.indexOf(':');
        if (sep < 0) continue;
        const action = payload.slice(0, sep);
        const ruleId = payload.slice(sep + 1);
        const psid = m.sender && m.sender.id;
        if (!psid) continue;
        const rule = rules.find((r) => r.id === ruleId);
        if (!rule) continue;

        if (action === 'WANT_LINK') {
          // Step 2 of 3: ask them to follow, with "I've followed" button.
          await sendMessage(igId, token, { id: psid }, followAskMessage(rule));
          await setPending(psid, { ruleId: rule.id, stage: 'asked_follow', sentAt: Date.now(), completed: false, reminded: false });
        } else if (action === 'CONFIRM_FOLLOW') {
          // Step 3 of 3: send the real link.
          await sendMessage(igId, token, { id: psid }, linkMessage(rule));
          await setPending(psid, { completed: true });
        }
      }
    }
  } catch (e) { /* swallow — Meta must get a 200 */ }

  return { statusCode: 200, body: 'EVENT_RECEIVED' };
};
