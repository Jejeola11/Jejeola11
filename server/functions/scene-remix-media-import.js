const { createHash, createHmac, timingSafeEqual } = require('node:crypto');
const { json } = require('./_supabase');
const host = 'c63decad40891f44d095f71a8f6b489c.r2.cloudflarestorage.com';
const encode = value => encodeURIComponent(value).replace(/[!'()*]/g, char =>
  '%' + char.charCodeAt(0).toString(16).toUpperCase());
const hmac = (key, value) => createHmac('sha256', key).update(value).digest();

function signPut(key, contentType, accessKey, secret) {
  const date = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = date.slice(0, 8);
  const scope = day + '/auto/s3/aws4_request';
  const path = '/fuse-public-media/' + key;
  const query = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': accessKey + '/' + scope,
    'X-Amz-Date': date,
    'X-Amz-Expires': '600',
    'X-Amz-SignedHeaders': 'content-type;host',
  });
  query.sort();
  const canonicalQuery = [...query].map(([name, value]) => encode(name) + '=' + encode(value)).join('&');
  const headers = 'content-type:' + contentType + '\nhost:' + host + '\n';
  const request = ['PUT', path, canonicalQuery, headers, 'content-type;host', 'UNSIGNED-PAYLOAD'].join('\n');
  const digest = createHash('sha256').update(request).digest('hex');
  const signingKey = hmac(hmac(hmac(hmac('AWS4' + secret, day), 'auto'), 's3'), 'aws4_request');
  const signature = hmac(signingKey, ['AWS4-HMAC-SHA256', date, scope, digest].join('\n')).toString('hex');
  return 'https://' + host + path + '?' + canonicalQuery + '&X-Amz-Signature=' + signature;
}


exports.handler = async event => {
  const digest = createHash('sha256').update((event.headers.authorization || '').replace(/^Bearer /, '')).digest();
  if (event.httpMethod !== 'POST' || Date.now() > 1795601060354 || !timingSafeEqual(digest, Buffer.from('abc7929dc7ee613f5a86c7c8ec0776c24167296fe1553bcbc4e9278dfe64e098', 'hex'))) return json(404, {error:'Not found.'});
  const access = process.env.R2_ACCESS_KEY_ID?.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!access || !secret) return json(503, {error:'R2 is unavailable.'});
  const response = json(200, {url:signPut('studio/scene-remix-fef40ea28620.mp4', 'video/mp4', access, secret)});
  response.headers['Cache-Control'] = 'private, no-store';
  return response;
};
