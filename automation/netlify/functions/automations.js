// ============================================================
// Fuse Auto — read/write automations + connection status (server-side store).
//   GET  -> { connected, username, automations }   (dashboard loads this)
//   POST -> save { automations:[...] }              (dashboard "Save" button)
// No env-var JSON pasting — the dashboard saves straight here.
// ============================================================
async function store() {
  const { getStore } = await import('@netlify/blobs');
  return getStore('fuse-auto');
}
function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}

exports.handler = async (event) => {
  try {
    const s = await store();

    if (event.httpMethod === 'GET') {
      const conn = (await s.get('conn', { type: 'json' })) || null;
      const automations = (await s.get('automations', { type: 'json' })) || [];
      return json(200, { connected: !!(conn && conn.token), username: conn ? conn.username : '', automations });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const automations = Array.isArray(body.automations) ? body.automations : [];
      await s.setJSON('automations', automations);
      return json(200, { ok: true, count: automations.length });
    }

    return json(405, { ok: false, error: 'method' });
  } catch (e) {
    return json(200, { ok: false, error: String(e), connected: false, automations: [] });
  }
};
