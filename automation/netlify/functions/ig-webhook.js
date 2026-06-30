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
//
// Troubleshooting: every event is logged (console.log) — view live activity
// in Netlify → this site → Functions → ig-webhook → Logs. Or use the
// dashboard's "Check my setup" / "Test a comment" tools (health.js).
// ============================================================
const { DEFAULT_DM, store, loadEverything, matchAutomation, logActivity } = require('./_lib');

const GRAPH = 'https://graph.instagram.com/v21.0';

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
  const r = await fetch(`${GRAPH}/${igId}/messages`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipient, message, access_token: token }),
  });
  const data = await safeJson(r);
  if (!r.ok || (data && data.error)) {
    console.error('[ig-webhook] sendMessage failed', r.status, JSON.stringify(data));
  }
  return data;
}
async function safeJson(r) { try { return await r.json(); } catch (e) { return null; } }
async function safe(p) { try { return await p; } catch (e) { console.error('[ig-webhook] request failed', String(e)); return null; } }
async function setPending(psid, patch) {
  try {
    const s = await store();
    const pending = (await s.get('pending', { type: 'json' })) || {};
    pending[psid] = { ...(pending[psid] || {}), ...patch };
    await s.setJSON('pending', pending);
  } catch (e) { console.error('[ig-webhook] setPending failed', String(e)); }
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

  // Always 200 fast; do the work but never throw back to Meta. Errors are logged,
  // never silently lost — check Netlify Functions logs if something looks wrong.
  try {
    const body = JSON.parse(event.body || '{}');
    console.log('[ig-webhook] event received', body.object, 'entries:', (body.entry || []).length);
    await logActivity({ kind: 'received', object: body.object, entries: (body.entry || []).length });
    const { token, igId, rules } = await loadEverything();
    console.log('[ig-webhook] loaded', rules.length, 'rule(s), token:', !!token, 'igId:', !!igId);
    if (!token || !igId) { console.error('[ig-webhook] missing token/igId — not connected, or env vars missing'); await logActivity({ kind: 'error', note: 'missing token/igId — not connected' }); return { statusCode: 200, body: 'EVENT_RECEIVED' }; }
    if (body.object !== 'instagram') { console.log('[ig-webhook] ignoring non-instagram object:', body.object); return { statusCode: 200, body: 'EVENT_RECEIVED' }; }

    for (const entry of (body.entry || [])) {
      // ----- new comments -----
      for (const ch of (entry.changes || [])) {
        if (ch.field !== 'comments') { console.log('[ig-webhook] ignoring change field:', ch.field); continue; }
        const v = ch.value || {};
        const text = (v.text || '').toLowerCase();
        const commentId = v.id;
        const mediaId = v.media && v.media.id ? String(v.media.id) : '';
        console.log('[ig-webhook] comment:', JSON.stringify(text), 'media:', mediaId, 'from:', v.from && v.from.id);
        if (v.from && String(v.from.id) === String(igId)) { console.log('[ig-webhook] skipping our own comment'); continue; }
        if (!commentId) { console.log('[ig-webhook] no comment id, skipping'); continue; }

        const rule = matchAutomation(rules, text, mediaId);
        if (!rule) {
          console.log('[ig-webhook] no rule matched this comment');
          await logActivity({ kind: 'comment', text, mediaId, matched: false });
          continue;
        }
        console.log('[ig-webhook] matched rule:', rule.name || rule.id);
        await logActivity({ kind: 'comment', text, mediaId, matched: true, ruleName: rule.name || rule.id });

        if (rule.replies.length) {
          const reply = rule.replies[Math.floor(Math.random() * rule.replies.length)];
          await safe(fetch(`${GRAPH}/${commentId}/replies`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: reply, access_token: token }),
          }));
        }

        // openDm and askFollow are independent toggles (like ManyChat's "an opening DM"
        // and "a DM asking to follow you" are separate switches):
        //   openDm only        -> open DM -> tap -> link directly
        //   askFollow only     -> follow-ask DM -> tap -> link directly
        //   both               -> open DM -> tap -> follow-ask DM -> tap -> link
        //   neither            -> link sent immediately, no gate
        let resp, stage;
        if (rule.openDm) {
          resp = await sendMessage(igId, token, { comment_id: commentId }, openMessage(rule));
          stage = 'opened';
        } else if (rule.askFollow && rule.followDm) {
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
        if (!rule) { console.log('[ig-webhook] postback for unknown/deleted rule', ruleId); await logActivity({ kind: 'postback', action, matched: false }); continue; }
        console.log('[ig-webhook] postback', action, 'rule:', rule.name || rule.id);
        await logActivity({ kind: 'postback', action, matched: true, ruleName: rule.name || rule.id });

        if (action === 'WANT_LINK') {
          if (rule.askFollow && rule.followDm) {
            await sendMessage(igId, token, { id: psid }, followAskMessage(rule));
            await setPending(psid, { ruleId: rule.id, stage: 'asked_follow', sentAt: Date.now(), completed: false, reminded: false });
          } else {
            await sendMessage(igId, token, { id: psid }, linkMessage(rule));
            await setPending(psid, { completed: true });
          }
        } else if (action === 'CONFIRM_FOLLOW') {
          await sendMessage(igId, token, { id: psid }, linkMessage(rule));
          await setPending(psid, { completed: true });
        }
      }
    }
  } catch (e) {
    console.error('[ig-webhook] handler error', String(e), e && e.stack);
  }

  return { statusCode: 200, body: 'EVENT_RECEIVED' };
};
