// GET /.netlify/functions/download?url=<media-url>&name=<filename>
// Proxies a generated image/video back with Content-Disposition: attachment so
// tapping "Download" saves the file directly instead of opening a new browser tab.
exports.handler = async (event) => {
  const q = event.queryStringParameters || {};
  const url = q.url;
  const name = (q.name || 'fuse-studio').replace(/[^a-z0-9_-]/gi, '');
  if (!url) return { statusCode: 400, body: 'missing url' };

  // Only proxy our known media hosts (avoid an open proxy).
  let host = '';
  try { host = new URL(url).host; } catch (e) { return { statusCode: 400, body: 'bad url' }; }
  const allowed = /(muapi\.ai|supabase\.co|fal\.(run|ai|media)|cdn\.)/i.test(host);
  if (!allowed) return { statusCode: 403, body: 'host not allowed' };

  try {
    const r = await fetch(url);
    if (!r.ok) return { statusCode: 502, body: 'fetch failed' };
    const ct = r.headers.get('content-type') || 'application/octet-stream';
    const ext = ct.includes('video') ? 'mp4' : ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const buf = Buffer.from(await r.arrayBuffer());
    return {
      statusCode: 200,
      headers: {
        'Content-Type': ct,
        'Content-Disposition': `attachment; filename="${name}.${ext}"`,
        'Cache-Control': 'no-store',
      },
      body: buf.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    return { statusCode: 502, body: 'error' };
  }
};
