// ============================================================
// Fuse Auto — your own ManyChat. Instagram comment -> auto public reply + DM.
// Handles UNLIMITED posts: each post can have its own keyword + DM ("automation").
//   GET  : Meta webhook verification (hub.challenge)
//   POST : a new comment arrives -> find the matching automation -> public reply + DM
//
// Env vars (set on this Netlify site):
//   VERIFY_TOKEN      - any string you pick (also paste it in the Meta webhook setup)
//   IG_USER_ID        - your Instagram Business account id
//   IG_ACCESS_TOKEN   - long-lived Instagram access token
//
//   FUSE_AUTOMATIONS  - the important one: a JSON array of rules, one per post.
//                       Build it visually on this site's homepage, then paste it here.
//        [
//          { "name":"AI Creative Director",
//            "media_id":"17900000000000000",         // optional: lock this rule to ONE post
//            "keywords":["director","prompt"],         // any of these in a comment triggers it
//            "replies":["Sent! check your DMs 📩"],   // optional, random public reply
//            "dm":"Here's the link 👉 https://..." },  // the DM that gets sent
//          { "name":"Ebook","keywords":["ebook"],"dm":"..." }
//        ]
//
//   Back-compat single-automation mode (used only if FUSE_AUTOMATIONS is empty):
//   KEYWORDS, DM_TEXT, PUBLIC_REPLIES
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

// Build the list of automations from env. Prefer FUSE_AUTOMATIONS (multi-post),
// fall back to the old single KEYWORDS/DM_TEXT pair so existing setups keep working.
function loadAutomations() {
  const raw = (process.env.FUSE_AUTOMATIONS || '').trim();
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr) && arr.length) {
        return arr.map((r) => ({
          name: r.name || '',
          media_id: r.media_id ? String(r.media_id) : '',
          keywords: (r.keywords || []).map((k) => String(k).trim().toLowerCase()).filter(Boolean),
          replies: (r.replies && r.replies.length ? r.replies : DEFAULT_REPLIES).map((s) => String(s).trim()).filter(Boolean),
          dm: r.dm || DEFAULT_DM,
        }));
      }
    } catch (e) { /* fall through to single mode */ }
  }
  // single-automation fallback
  return [{
    name: 'default',
    media_id: '',
    keywords: (process.env.KEYWORDS || 'PROMPT,prompt,Prompt,PROMPTS').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean),
    replies: (process.env.PUBLIC_REPLIES ? process.env.PUBLIC_REPLIES.split('|') : DEFAULT_REPLIES).map((s) => s.trim()).filter(Boolean),
    dm: process.env.DM_TEXT || DEFAULT_DM,
  }];
}

// Pick the best automation for a comment. A rule locked to this post (media_id)
// wins over a global rule; within that, a keyword must match (unless the rule has
// no keywords, meaning "any comment on this post").
function matchAutomation(rules, text, mediaId) {
  const kwHit = (r) => r.keywords.length === 0 || r.keywords.some((k) => text.includes(k));
  // 1) rule locked to THIS post + keyword (or no-keyword catch-all for the post)
  let r = rules.find((x) => x.media_id && mediaId && x.media_id === mediaId && kwHit(x));
  if (r) return r;
  // 2) global rule (no media lock) matched by keyword
  r = rules.find((x) => !x.media_id && x.keywords.length && kwHit(x));
  if (r) return r;
  // 3) global catch-all (no media, no keywords)
  return rules.find((x) => !x.media_id && x.keywords.length === 0) || null;
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
    const token = process.env.IG_ACCESS_TOKEN;
    const igId = process.env.IG_USER_ID;
    const rules = loadAutomations();

    if (token && igId && body.object === 'instagram') {
      for (const entry of (body.entry || [])) {
        for (const ch of (entry.changes || [])) {
          if (ch.field !== 'comments') continue;
          const v = ch.value || {};
          const text = (v.text || '').toLowerCase();
          const commentId = v.id;
          const mediaId = v.media && v.media.id ? String(v.media.id) : '';
          // Skip our own comments / replies.
          if (v.from && String(v.from.id) === String(igId)) continue;
          if (!commentId) continue;

          const rule = matchAutomation(rules, text, mediaId);
          if (!rule) continue;

          // 1) public reply under the comment
          if (rule.replies.length) {
            const reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
            await safe(fetch(`${GRAPH}/${commentId}/replies`, {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ message: reply, access_token: token }),
            }));
          }

          // 2) private reply (DM) to the commenter
          await safe(fetch(`${GRAPH}/${igId}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: rule.dm }, access_token: token }),
          }));
        }
      }
    }
  } catch (e) { /* swallow — Meta must get a 200 */ }

  return { statusCode: 200, body: 'EVENT_RECEIVED' };
};

async function safe(p) { try { return await p; } catch (e) { return null; } }
