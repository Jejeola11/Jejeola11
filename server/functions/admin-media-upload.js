const { createHash, createHmac, randomUUID } = require('node:crypto');
const { admin, getUser, json } = require('./_supabase');

const host = 'c63decad40891f44d095f71a8f6b489c.r2.cloudflarestorage.com';
const publicBase = 'https://pub-f4b13b406b604465ab1a6cbf282141ad.r2.dev';
const mime = new Map([
  ['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['png', 'image/png'],
  ['webp', 'image/webp'], ['avif', 'image/avif'], ['gif', 'image/gif'],
  ['mp4', 'video/mp4'], ['webm', 'video/webm'], ['mov', 'video/quicktime'],
]);
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
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Sign in with your Fuse Atelier admin account.' });
  const { data, error } = await admin().from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
  if (error) return json(503, { error: 'Could not verify admin access.' });
  if (data?.is_admin !== true) return json(403, { error: 'Admin access is required.' });

  let input;
  try { input = JSON.parse(event.body); }
  catch { return json(400, { error: 'Enter a valid image or video filename.' }); }
  const filename = input?.filename;
  if (typeof filename !== 'string' || filename.length > 180) {
    return json(400, { error: 'Enter a valid image or video filename.' });
  }
  const ext = filename.match(/\.([a-z0-9]+)$/i)?.[1]?.toLowerCase();
  const contentType = mime.get(ext);
  if (!contentType) return json(400, { error: 'Use JPG, PNG, WebP, AVIF, GIF, MP4, WebM or MOV.' });
  const accessKey = process.env.R2_ACCESS_KEY_ID?.trim();
  const secret = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (!accessKey || !secret) return json(503, { error: 'R2 credentials are missing from this deployment.' });

  const stem = filename.slice(0, -(ext.length + 1)).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '').slice(0, 75) || 'media';
  const key = 'uploads/' + randomUUID() + '/' + stem + '.' + ext;
  const response = json(200, {
    uploadUrl: signPut(key, contentType, accessKey, secret),
    publicUrl: publicBase + '/' + key,
    contentType,
    expiresIn: 600,
  });
  response.headers['Cache-Control'] = 'private, no-store';
  return response;
};
