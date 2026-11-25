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
  const expected = Buffer.from('3d7e29c09569f20e9fdcd1d5fc3954e112a00c675e9b8f68c94706c5572e8d18', 'hex');
  if (event.httpMethod !== 'POST' || Date.now() > 1795587886366 || !timingSafeEqual(digest, expected)) {
    return json(404, { error: 'Not found.' });
  }
  const access = process.env.R2_ACCESS_KEY_ID?.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!access || !secret) return json(503, { error: 'R2 is unavailable.' });
  const keys = ["community/batch-3d7e29c09569/1000293847.mp4","community/batch-3d7e29c09569/1000293847.jpg","community/batch-3d7e29c09569/1000269372.mp4","community/batch-3d7e29c09569/1000269372.jpg","community/batch-3d7e29c09569/4786214.mp4","community/batch-3d7e29c09569/4786214.jpg","community/batch-3d7e29c09569/1000269069.mp4","community/batch-3d7e29c09569/1000269069.jpg","community/batch-3d7e29c09569/1000239201.mp4","community/batch-3d7e29c09569/1000239201.jpg","community/batch-3d7e29c09569/1000277869.mp4","community/batch-3d7e29c09569/1000277869.jpg","community/batch-3d7e29c09569/1000296603.mp4","community/batch-3d7e29c09569/1000296603.jpg","community/batch-3d7e29c09569/1000255877.mp4","community/batch-3d7e29c09569/1000255877.jpg","community/batch-3d7e29c09569/1000254610.mp4","community/batch-3d7e29c09569/1000254610.jpg","community/batch-3d7e29c09569/1000035070.mp4","community/batch-3d7e29c09569/1000035070.jpg","community/batch-3d7e29c09569/4792334.mp4","community/batch-3d7e29c09569/4792334.jpg","community/batch-3d7e29c09569/1000277949.mp4","community/batch-3d7e29c09569/1000277949.jpg","community/batch-3d7e29c09569/1000296321.mp4","community/batch-3d7e29c09569/1000296321.jpg","community/batch-3d7e29c09569/1000149572.mp4","community/batch-3d7e29c09569/1000149572.jpg","community/batch-3d7e29c09569/1000251262.mp4","community/batch-3d7e29c09569/1000251262.jpg","community/batch-3d7e29c09569/1000274359.mp4","community/batch-3d7e29c09569/1000274359.jpg","community/batch-3d7e29c09569/1000149399.mp4","community/batch-3d7e29c09569/1000149399.jpg","community/batch-3d7e29c09569/1000268269.mp4","community/batch-3d7e29c09569/1000268269.jpg","community/batch-3d7e29c09569/1000255777.mp4","community/batch-3d7e29c09569/1000255777.jpg","community/batch-3d7e29c09569/1000272586.mp4","community/batch-3d7e29c09569/1000272586.jpg"];
  const response = json(200, Object.fromEntries(keys.map(key => [
    key, signPut(key, key.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg', access, secret),
  ])));
  response.headers['Cache-Control'] = 'private, no-store';
  return response;
};
