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
    'X-Amz-Expires': '1800',
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
  if (event.httpMethod !== 'POST' || Date.now() > 1795588542094 || !timingSafeEqual(digest, Buffer.from('1b337204c26ba993be658cbfc97fa091ebac62d2baf6fe4622c6569221f186d2', 'hex'))) return json(404, { error: 'Not found.' });
  const access = process.env.R2_ACCESS_KEY_ID?.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!access || !secret) return json(503, { error: 'R2 is unavailable.' });
  const keys = ["community/batch-1b337204c26b/VID-20260803-WA0067.mp4","community/batch-1b337204c26b/VID-20260803-WA0067.jpg","community/batch-1b337204c26b/VID-20260810-WA0081.mp4","community/batch-1b337204c26b/VID-20260810-WA0081.jpg","community/batch-1b337204c26b/VID-20260827-WA0029.mp4","community/batch-1b337204c26b/VID-20260827-WA0029.jpg","community/batch-1b337204c26b/VID-20260908-WA0018.mp4","community/batch-1b337204c26b/VID-20260908-WA0018.jpg","community/batch-1b337204c26b/VID-20260922-WA0048.mp4","community/batch-1b337204c26b/VID-20260922-WA0048.jpg","community/batch-1b337204c26b/VID-20260923-WA0020.mp4","community/batch-1b337204c26b/VID-20260923-WA0020.jpg","community/batch-1b337204c26b/VID-20260924-WA0018.mp4","community/batch-1b337204c26b/VID-20260924-WA0018.jpg","community/batch-1b337204c26b/VID-20260928-WA0034.mp4","community/batch-1b337204c26b/VID-20260928-WA0034.jpg","community/batch-1b337204c26b/VID-20261003-WA0031.mp4","community/batch-1b337204c26b/VID-20261003-WA0031.jpg","community/batch-1b337204c26b/VID-20261007-WA0005.mp4","community/batch-1b337204c26b/VID-20261007-WA0005.jpg","community/batch-1b337204c26b/VID-20261007-WA0024.mp4","community/batch-1b337204c26b/VID-20261007-WA0024.jpg","community/batch-1b337204c26b/VID-20261016-WA0022.mp4","community/batch-1b337204c26b/VID-20261016-WA0022.jpg","community/batch-1b337204c26b/VID-20261027-WA0044.mp4","community/batch-1b337204c26b/VID-20261027-WA0044.jpg"];
  const response = json(200, Object.fromEntries(keys.map(key => [key, signPut(key, key.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', access, secret)])));
  response.headers['Cache-Control'] = 'private, no-store';
  return response;
};
