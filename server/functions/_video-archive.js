// Preserve provider videos in our public media bucket before transient CDN URLs expire.
// A failure leaves the original link intact; clients can request a later retry.
const MAX_BYTES = 48 * 1024 * 1024;
const PROVIDER_HOST = 'd2h7xmz5gqybh9.cloudfront.net';
const STORAGE_HOST = 'rgbweaimkcndjznlazho.supabase.co';

function isArchived(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && u.hostname === STORAGE_HOST && u.pathname.startsWith('/storage/v1/object/public/avatars/');
  } catch (_) { return false; }
}

async function archiveVideo(db, userId, url, key) {
  if (isArchived(url)) return url;
  let parsed;
  try { parsed = new URL(url); } catch (_) { return url; }
  if (parsed.protocol !== 'https:' || parsed.hostname !== PROVIDER_HOST || !/^\/(output|predictions)\//.test(parsed.pathname)) return url;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(35000) });
    if (!response.ok) return url;
    const declared = Number(response.headers.get('content-length'));
    if (declared > MAX_BYTES) { await response.body?.cancel(); return url; }
    const chunks = [];
    let length = 0;
    for await (const chunk of response.body) {
      length += chunk.length;
      if (length > MAX_BYTES) { await response.body?.cancel(); return url; }
      chunks.push(chunk);
    }
    if (!length) return url;
    const path = `${userId}/video-${String(key).replace(/[^a-zA-Z0-9_-]/g, '').slice(0,80)}.mp4`;
    const { error } = await db.storage.from('avatars').upload(path, Buffer.concat(chunks), { contentType: 'video/mp4', upsert: true });
    if (error) { console.warn('[video archive] upload failed', error.message); return url; }
    return db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  } catch (error) {
    console.warn('[video archive] source unavailable', error.message);
    return url;
  }
}

module.exports = { archiveVideo, isArchived };
