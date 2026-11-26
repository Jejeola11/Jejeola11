const {createHash,createHmac,timingSafeEqual}=require('node:crypto');
const {json}=require('./_supabase');
const host='c63decad40891f44d095f71a8f6b489c.r2.cloudflarestorage.com';
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


exports.handler=async event=>{
 const verified=timingSafeEqual(createHash('sha256').update(event.headers.authorization||'').digest(),Buffer.from('de4b35cc5a073016de09ce927999e123679ae51177681777fb7ce96c71e86cc7','hex'));
 if(!verified||event.httpMethod!=='POST'||Date.now()>1795681716799)return json(404,{error:'Not found'});
 const access=process.env.R2_ACCESS_KEY_ID?.trim(),secret=process.env.R2_SECRET_ACCESS_KEY?.trim();
 if(!access||!secret)return json(503,{error:'Upload unavailable'});
 const response=json(200,Object.fromEntries([["1000087936","directorria/reels/1000087936-9752744c52b7.mp4"],["1000256012","directorria/reels/1000256012-d06636bc25ad.mp4"],["1000263708","directorria/reels/1000263708-92819f77cdf3.mp4"],["1000269271","directorria/reels/1000269271-c7c6576a459d.mp4"]].map(([id,key])=>[id,signPut(key,'video/mp4',access,secret)])));
 response.headers['Cache-Control']='private, no-store';return response;
};