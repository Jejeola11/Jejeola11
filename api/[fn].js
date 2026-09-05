// Vercel-native adapter for the existing Fuse Atelier function handlers.
// One dynamic endpoint keeps the current CommonJS function modules intact while
// serving them from /api/<function-name> on Vercel.
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
    httpMethod: req.method || 'GET',
    headers: req.headers || {},
    body,
    queryStringParameters: query,
    path: '/api/' + fn,
    rawUrl: 'https://' + ((req.headers && req.headers.host) || 'fuse-atelier.vercel.app') + (req.url || ('/api/' + fn)),
    isBase64Encoded: false
  };
}

async function loadHandler(fn) {
  if (!/^[A-Za-z0-9_-]+$/.test(fn || '')) throw new Error('Invalid function name');
  const ext = (fn === 'hero-video' || fn === 'runtime-config') ? '.mjs' : '.js';
  const file = path.join(process.cwd(), 'server', 'functions', fn + ext);
  const mod = await import(pathToFileURL(file).href);
  return mod.handler || (mod.default && mod.default.handler) || mod.default;
}

module.exports = async function vercelHandler(req, res) {
  try {
    const fn = String((req.query && req.query.fn) || '').trim();
    const handler = await loadHandler(fn);
    if (typeof handler !== 'function') {
      res.statusCode = 404;
      return res.end(JSON.stringify({ error: 'Function not found' }));
    }
    const out = await handler(eventFromRequest(req, fn), {});
    const status = (out && out.statusCode) || 200;
    res.statusCode = status;
    if (out && out.headers) {
      for (const [k,v] of Object.entries(out.headers)) if (v != null) res.setHeader(k, String(v));
    }
    if (out && out.multiValueHeaders) {
      for (const [k,v] of Object.entries(out.multiValueHeaders)) if (Array.isArray(v)) res.setHeader(k, v);
    }
    const payload = out && out.body != null ? out.body : '';
    if (out && out.isBase64Encoded) return res.end(Buffer.from(payload, 'base64'));
    return res.end(typeof payload === 'string' ? payload : JSON.stringify(payload));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('content-type','application/json; charset=utf-8');
    return res.end(JSON.stringify({ error: (err && err.message) || 'Server error' }));
  }
};
