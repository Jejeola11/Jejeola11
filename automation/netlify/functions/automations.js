// ============================================================
// Fuse Auto — read/write automations + connection status (server-side store).
//   GET  -> { connected, username, automations }   (dashboard loads this)
//   POST -> save { automations:[...] }              (dashboard "Save" button)
// No env-var JSON pasting — the dashboard saves straight here.
// ============================================================
const crypto = require('crypto');
const { store } = require('./_lib');
function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}
// Every rule needs a stable id (the "Send me the LINK" button payload references it) —
// assign one to any rule that doesn't have it yet.
function ensureIds(automations) {
  let changed = false;
  const out = automations.map((r) => {
    if (r && !r.id) { changed = true; return { ...r, id: crypto.randomUUID() }; }
    return r;
  });
  return { out, changed };
}

exports.handler = async (event) => {
  try {
    const s = await store();

    if (event.httpMethod === 'GET') {
      const conn = (await s.get('conn', { type: 'json' })) || null;
      const raw = (await s.get('automations', { type: 'json' })) || [];
      const { out: automations, changed } = ensureIds(raw);
      if (changed) await s.setJSON('automations', automations);
      return json(200, { connected: !!(conn && conn.token), username: conn ? conn.username : '', automations });
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const raw = Array.isArray(body.automations) ? body.automations : [];
      const { out: automations } = ensureIds(raw);
      await s.setJSON('automations', automations);
      return json(200, { ok: true, count: automations.length });
    }

    return json(405, { ok: false, error: 'method' });
  } catch (e) {
    console.error('[automations] handler error', String(e));
    return json(200, { ok: false, error: String(e), connected: false, automations: [] });
  }
};
