// ============================================================
// Fuse Auto — your own ManyChat. Instagram comment -> auto public reply + DM.
//   GET  : Meta webhook verification (hub.challenge)
//   POST : a new comment arrives -> if it contains a keyword, reply under the post
//          and send the commenter a DM (private reply) with your link.
//
// Env vars (set on this Netlify site):
//   VERIFY_TOKEN      - any string you pick (also paste it in the Meta webhook setup)
//   IG_USER_ID        - your Instagram Business account id
//   IG_ACCESS_TOKEN   - long-lived Instagram access token
//   KEYWORDS          - optional, comma list (default: PROMPT,prompt,Prompt,PROMPTS)
//   DM_TEXT           - optional, the DM message (good default below)
//   PUBLIC_REPLIES    - optional, pipe(|)-separated public reply variations
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
    const keywords = (process.env.KEYWORDS || 'PROMPT,prompt,Prompt,PROMPTS').split(',').map((k) => k.trim().toLowerCase()).filter(Boolean);
    const dmText = process.env.DM_TEXT || DEFAULT_DM;
    const replies = (process.env.PUBLIC_REPLIES ? process.env.PUBLIC_REPLIES.split('|') : DEFAULT_REPLIES).map((s) => s.trim()).filter(Boolean);

    if (token && igId && body.object === 'instagram') {
      for (const entry of (body.entry || [])) {
        for (const ch of (entry.changes || [])) {
          if (ch.field !== 'comments') continue;
          const v = ch.value || {};
          const text = (v.text || '').toLowerCase();
          const commentId = v.id;
          // Skip our own comments / replies.
          if (v.from && String(v.from.id) === String(igId)) continue;
          if (!commentId || !keywords.some((k) => text.includes(k))) continue;

          // 1) public reply under the comment
          const reply = replies[Math.floor(Math.random() * replies.length)];
          await safe(fetch(`${GRAPH}/${commentId}/replies`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: reply, access_token: token }),
          }));

          // 2) private reply (DM) to the commenter
          await safe(fetch(`${GRAPH}/${igId}/messages`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ recipient: { comment_id: commentId }, message: { text: dmText }, access_token: token }),
          }));
        }
      }
    }
  } catch (e) { /* swallow — Meta must get a 200 */ }

  return { statusCode: 200, body: 'EVENT_RECEIVED' };
};

async function safe(p) { try { return await p; } catch (e) { return null; } }
