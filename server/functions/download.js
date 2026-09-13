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

  // Don't buffer the file (Netlify caps function responses at ~6MB, which crashes
  // on videos). Just redirect the browser to the CDN file. The client handles the
  // real "save as" via a direct fetch+blob; this is only a safe fallback.
  return { statusCode: 302, headers: { Location: url, 'Cache-Control': 'no-store' }, body: '' };
};
