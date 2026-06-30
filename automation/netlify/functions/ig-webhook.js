// ============================================================
// Fuse Auto — your own ManyChat. Instagram comment -> auto public reply + DM.
// Handles UNLIMITED posts: each post can have its own keyword + DM ("automation").
// Supports a ManyChat-style "ask them to follow first" gate: send a DM with a
// "Send me the LINK" button; only when they tap it do we send the real link DM.
// (Instagram's API can't actually verify a follow — this is the same honor-system
// button-tap flow ManyChat itself uses.) Optional reminder DM if they never tap.
//
//   GET  : Meta webhook verification (hub.challenge)
//   POST : comment events  -> match a rule -> public reply + DM (or follow-ask DM)
//          messaging events -> "Send me the LINK" button tap -> send the real DM
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
    askFollow: false, followDm: '', buttons: [], reminderDm: '', reminderMinutes: 60,
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
function followAskMessage(rule) {
  return { attachment: { type: 'template', payload: { template_type: 'button', text: String(rule.followDm || '').slice(0, 640), buttons: [{ type: 'postback', title: 'Send me the LINK', payload: `GET_LINK:${rule.id}` }] } } };
}
async function sendMessage(igId, token, recipient, message) {
  return safeJson(fetch(`${GRAPH}/${igId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, message, access_token: token }),
  }));
}
async function safeJson(p) { try { const r = await p; return await r.json(); } catch (e) { return null; } }
async function safe(p) { try { return await p; } catch (e) { return null; } }

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

        if (rule.askFollow && rule.followDm) {
          // Send the "follow me first" DM with a tap-to-get-link button.
          const resp = await sendMessage(igId, token, { comment_id: commentId }, followAskMessage(rule));
          const psid = resp && (resp.recipient_id || (resp.recipient && resp.recipient.id));
          if (psid) {
            try {
              const s = await store();
              const pending = (await s.get('pending', { type: 'json' })) || {};
              pending[psid] = { ruleId: rule.id, sentAt: Date.now(), completed: false, reminded: false };
              await s.setJSON('pending', pending);
            } catch (e) { /* reminder just won't fire — link button still works */ }
          }
        } else {
          await sendMessage(igId, token, { comment_id: commentId }, linkMessage(rule));
        }
      }

      // ----- "Send me the LINK" button taps -----
      for (const m of (entry.messaging || [])) {
        const payload = m.postback && m.postback.payload;
        if (!payload || !payload.startsWith('GET_LINK:')) continue;
        const ruleId = payload.slice('GET_LINK:'.length);
        const psid = m.sender && m.sender.id;
        if (!psid) continue;

        const rule = rules.find((r) => r.id === ruleId);
        await sendMessage(igId, token, { id: psid }, rule ? linkMessage(rule) : { text: DEFAULT_DM });
        try {
          const s = await store();
          const pending = (await s.get('pending', { type: 'json' })) || {};
          if (pending[psid]) { pending[psid].completed = true; await s.setJSON('pending', pending); }
        } catch (e) {}
      }
    }
  } catch (e) { /* swallow — Meta must get a 200 */ }

  return { statusCode: 200, body: 'EVENT_RECEIVED' };
};
