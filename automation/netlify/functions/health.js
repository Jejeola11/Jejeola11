// ============================================================
// Fuse Auto — self-diagnostic. Powers the dashboard's "Check my setup" and
// "Test a comment" tools, so you don't need to comment-and-wait to find out
// why something isn't firing.
//
//   GET  ?text=...&media_id=...   -> connection + webhook-subscription status,
//                                     automations summary, and (if text given)
//                                     which rule would match that comment.
//   POST { action: 'resubscribe' } -> re-runs the Instagram webhook subscribe
//                                      call using the already-stored token
//                                      (no reconnect needed).
// ============================================================
const { loadEverything, matchAutomation } = require('./_lib');
const GRAPH = 'https://graph.instagram.com/v21.0';

function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

async function checkSubscription(igId, token) {
  try {
    const r = await fetch(`${GRAPH}/${igId}/subscribed_apps?access_token=${encodeURIComponent(token)}`);
    const d = await r.json();
    if (d.error) return { ok: false, reason: d.error.message || 'api_error' };
    const entry = (d.data || [])[0];
    const fields = (entry && entry.subscribed_fields) || [];
    return { ok: true, fields, comments: fields.includes('comments'), messaging_postbacks: fields.includes('messaging_postbacks') };
  } catch (e) {
    return { ok: false, reason: String(e) };
  }
}

async function resubscribe(igId, token) {
  try {
    const r = await fetch(`${GRAPH}/${igId}/subscribed_apps?subscribed_fields=comments,messaging_postbacks&access_token=${encodeURIComponent(token)}`, { method: 'POST' });
    const d = await r.json();
    return { ok: !!d.success, detail: d };
  } catch (e) {
    return { ok: false, detail: String(e) };
  }
}

exports.handler = async (event) => {
  try {
    const { token, igId, rules, conn } = await loadEverything();
    const connected = !!(token && igId);

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      if (body.action === 'resubscribe') {
        if (!connected) return json(200, { ok: false, reason: 'not_connected' });
        const result = await resubscribe(igId, token);
        return json(200, result);
      }
      return json(400, { ok: false, reason: 'unknown_action' });
    }

    const q = event.queryStringParameters || {};
    const summary = rules.map((r) => ({
      id: r.id, name: r.name || '(untitled)',
      post: r.media_id ? 'specific post' : 'any post',
      keywords: r.keywords.length ? r.keywords : ['(any word)'],
      hasOpenDm: !!r.openDm, hasFollowGate: !!(r.askFollow && r.followDm), hasReminder: !!r.reminderDm,
    }));

    let subscription = null;
    if (connected) subscription = await checkSubscription(igId, token);

    let test = null;
    if (q.text !== undefined) {
      const rule = matchAutomation(rules, String(q.text).toLowerCase(), q.media_id || '');
      test = rule ? { matched: true, name: rule.name || '(untitled)', id: rule.id } : { matched: false };
    }

    return json(200, {
      connected, username: conn ? conn.username : '',
      automationCount: rules.length, automations: summary,
      subscription, test,
    });
  } catch (e) {
    return json(200, { ok: false, error: String(e) });
  }
};
