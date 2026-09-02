const SOURCES = {
  left: {
    primary: 'https://drive.google.com/uc?export=download&id=1x9pyHD1UY_WR08Cid5FbMyKN01jWvmJ6',
    fallback: 'https://drive.usercontent.google.com/download?id=1x9pyHD1UY_WR08Cid5FbMyKN01jWvmJ6&export=download&confirm=t'
  },
  right: {
    primary: 'https://drive.google.com/uc?export=download&id=1mYB-50Jdd7NLeJyG_STnQHTla9jbCTkY',
    fallback: 'https://drive.usercontent.google.com/download?id=1mYB-50Jdd7NLeJyG_STnQHTla9jbCTkY&export=download&confirm=t'
  }
};

function isHtml(response) {
  return (response.headers.get('content-type') || '').toLowerCase().includes('text/html');
}

async function fetchVideo(url, range) {
  const headers = new Headers({
    'user-agent': 'Mozilla/5.0 (compatible; FuseAtelierMedia/1.0)',
    'accept': 'video/mp4,video/*;q=0.9,*/*;q=0.5'
  });
  if (range) headers.set('range', range);
  return fetch(url, { headers, redirect: 'follow' });
}

export default async (request) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } });
  }

  const url = new URL(request.url);
  const slot = url.searchParams.get('slot');
  const source = SOURCES[slot];
  if (!source) return new Response('Unknown video', { status: 404 });

  const range = request.headers.get('range');
  let upstream = await fetchVideo(source.primary, range);

  if (!upstream.ok || isHtml(upstream)) {
    upstream = await fetchVideo(source.fallback, range);
  }

  if (!upstream.ok || isHtml(upstream)) {
    return new Response('Video source unavailable', {
      status: 502,
      headers: { 'cache-control': 'no-store' }
    });
  }

  const headers = new Headers();
  headers.set('content-type', upstream.headers.get('content-type') || 'video/mp4');
  headers.set('content-disposition', 'inline');
  headers.set('cache-control', 'public, max-age=86400');
  headers.set('netlify-cdn-cache-control', 'public, max-age=86400, durable');

  for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (!headers.has('accept-ranges')) headers.set('accept-ranges', 'bytes');

  return new Response(request.method === 'HEAD' ? null : upstream.body, {
    status: upstream.status,
    headers
  });
};

export const config = {
  path: '/hero-video'
};
