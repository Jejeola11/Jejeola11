// Shared MuAPI image generation (submit + poll). Server-side only.
const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

async function muapiGenerate({ prompt, aspect = '9:16', model = 'flux-schnell' }) {
  const key = process.env.MUAPI_KEY;
  const submit = await fetch(`${MUAPI_BASE}/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: aspect }),
  });
  const txt = await submit.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + submit.status));
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not return a job id');
  for (let i = 0; i < 85; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const pr = await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': key } });
    const p = await pr.json();
    if (p.status === 'completed') return { url: p.outputs && p.outputs[0], cost_usd: p.cost && p.cost.amount_usd };
    if (p.status === 'failed' || p.status === 'cancelled') throw new Error('Generation ' + p.status);
  }
  throw new Error('Timed out');
}

// Re-host a reference image on MuAPI's own CDN so the engine can always fetch
// it (some external URLs aren't reachable by MuAPI). Returns the cdn.muapi.ai
// URL, or the original on any failure.
async function muapiHostImage(srcUrl) {
  try {
    const resp = await fetch(srcUrl);
    if (!resp.ok) return srcUrl;
    const buf = Buffer.from(await resp.arrayBuffer());
    const ct = resp.headers.get('content-type') || 'image/jpeg';
    const ext = ct.includes('png') ? 'png' : ct.includes('webp') ? 'webp' : 'jpg';
    const fd = new FormData();
    fd.append('file', new Blob([buf], { type: ct }), 'ref.' + ext);
    const up = await fetch(`${MUAPI_BASE}/upload_file`, { method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY }, body: fd });
    const j = await up.json();
    return (j && j.url) ? j.url : srcUrl;
  } catch (e) { return srcUrl; }
}

module.exports = { muapiGenerate, muapiHostImage };
