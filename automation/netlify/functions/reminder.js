// Scheduled function (see netlify.toml: runs every 30 min) — sends the
// "did you forget?" follow-up DM to anyone who got a follow-ask DM but never
// tapped "Send me the LINK".
const GRAPH = 'https://graph.instagram.com/v21.0';

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

exports.handler = async () => {
  try {
    const s = await store();
    const conn = await s.get('conn', { type: 'json' });
    const token = (conn && conn.token) || process.env.IG_ACCESS_TOKEN;
    const igId = (conn && conn.userId) || process.env.IG_USER_ID;
    if (!token || !igId) return { statusCode: 200, body: 'not connected' };

    const automations = (await s.get('automations', { type: 'json' })) || [];
    const pending = (await s.get('pending', { type: 'json' })) || {};
    const now = Date.now();
    let sent = 0;

    for (const psid of Object.keys(pending)) {
      const p = pending[psid];
      if (!p || p.completed || p.reminded) continue;
      const rule = automations.find((r) => r.id === p.ruleId);
      const reminderDm = rule && rule.reminderDm;
      const waitMin = (rule && rule.reminderMinutes) || 60;
      if (!reminderDm) { p.reminded = true; continue; }
      if (now - p.sentAt < waitMin * 60 * 1000) continue;
      try {
        await fetch(`${GRAPH}/${igId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipient: { id: psid }, message: { text: reminderDm }, access_token: token }),
        });
        sent++;
      } catch (e) {}
      p.reminded = true;
    }

    // light cleanup — drop resolved entries older than 7 days
    const WEEK = 7 * 24 * 60 * 60 * 1000;
    for (const psid of Object.keys(pending)) {
      const p = pending[psid];
      if (p && (p.completed || p.reminded) && now - p.sentAt > WEEK) delete pending[psid];
    }
    await s.setJSON('pending', pending);
    return { statusCode: 200, body: `reminders sent: ${sent}` };
  } catch (e) {
    return { statusCode: 200, body: 'error: ' + String(e) };
  }
};
