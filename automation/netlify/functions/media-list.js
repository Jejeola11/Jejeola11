// GET /.netlify/functions/media-list
// Returns your recent Instagram posts (id, caption, thumbnail, permalink) using the
// server-side IG_ACCESS_TOKEN — so the builder can show your posts and you can attach
// an automation to each one by its real media id. Token never touches the browser.
const { store } = require('./_lib');
const GRAPH = 'https://graph.instagram.com/v21.0';

exports.handler = async (event) => {
  // Prefer the one-tap connection; fall back to manual env vars.
  let token = process.env.IG_ACCESS_TOKEN || '';
  let igId = process.env.IG_USER_ID || '';
  try {
    const conn = await (await store()).get('conn', { type: 'json' });
    if (conn && conn.token) { token = conn.token; igId = conn.userId || igId; }
  } catch (e) { /* env fallback */ }
  if (!token || !igId) {
    return json(200, { ok: false, reason: 'not_connected', items: [] });
  }
  try {
    // No cap on how many posts you can browse — paginate with ?after=<cursor>
    // (the dashboard's "Load more" button supplies this). Automations themselves
    // are never limited regardless of how you pick the post.
    const after = (event.queryStringParameters || {}).after || '';
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    let url = `${GRAPH}/${igId}/media?fields=${encodeURIComponent(fields)}&limit=50&access_token=${token}`;
    if (after) url += `&after=${encodeURIComponent(after)}`;
    const r = await fetch(url);
    const data = await r.json();
    if (data.error) return json(200, { ok: false, reason: data.error.message || 'api_error', items: [] });
    const items = (data.data || []).map((m) => ({
      id: m.id,
      caption: (m.caption || '').slice(0, 90),
      thumb: m.thumbnail_url || m.media_url || '',
      permalink: m.permalink || '',
      type: m.media_type || '',
    }));
    const next = data.paging && data.paging.cursors && data.paging.next ? data.paging.cursors.after : '';
    return json(200, { ok: true, items, next });
  } catch (e) {
    return json(200, { ok: false, reason: String(e), items: [] });
  }
};

function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}
