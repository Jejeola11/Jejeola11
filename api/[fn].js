// Vercel adapter for the existing Fuse Atelier server handlers.
const path = require('path');
const { pathToFileURL } = require('url');

function eventFromRequest(req, fn) {
  let body = req.body;
  if (body == null) body = '';
  else if (Buffer.isBuffer(body)) body = body.toString('utf8');
  else if (typeof body !== 'string') body = JSON.stringify(body);
  const query = { ...(req.query || {}) };
  delete query.fn;
  return {
    httpMethod: req.method || 'GET', headers: req.headers || {}, body,
    queryStringParameters: query, path: '/api/' + fn,
    rawUrl: 'https://' + ((req.headers && req.headers.host) || 'fuse-atelier.vercel.app') + (req.url || ('/api/' + fn)),
    isBase64Encoded: false
  };
}

async function loadHandler(fn) {
  if (!/^[A-Za-z0-9_-]+$/.test(fn || '')) throw new Error('Invalid function name');
  const file = path.join(process.cwd(), 'server', 'functions', fn + '.js');
  const mod = await import(pathToFileURL(file).href);
  return mod.handler || (mod.default && mod.default.handler) || mod.default;
}

module.exports = async function vercelHandler(req, res) {
  try {
    const fn = String((req.query && req.query.fn) || '').trim();
    const handler = await loadHandler(fn);
    if (typeof handler !== 'function') { res.statusCode = 404; return res.end(JSON.stringify({ error: 'Function not found' })); }
    const out = await handler(eventFromRequest(req, fn), {});
    res.statusCode = (out && out.statusCode) || 200;
    if (out && out.headers) for (const [key, value] of Object.entries(out.headers)) if (value != null) res.setHeader(key, String(value));
    const payload = out && out.body != null ? out.body : '';
    return res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: (error && error.message) || 'Server error' }));
  }
};
