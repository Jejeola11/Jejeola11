// GET /.netlify/functions/media-list
// Returns your recent Instagram posts (id, caption, thumbnail, permalink) using the
// server-side IG_ACCESS_TOKEN — so the builder can show your posts and you can attach
// an automation to each one by its real media id. Token never touches the browser.
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
    const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp';
    const url = `${GRAPH}/${igId}/media?fields=${encodeURIComponent(fields)}&limit=30&access_token=${token}`;
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
    return json(200, { ok: true, items });
  } catch (e) {
    return json(200, { ok: false, reason: String(e), items: [] });
  }
};

function json(code, obj) {
  return { statusCode: code, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(obj) };
}
