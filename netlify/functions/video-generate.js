// ============================================================
// POST /.netlify/functions/video-generate   (Video Studio)
// Auth required. Body: { model, prompt, aspect, duration, resolution, image_url? }
// Generates a video via MuAPI (text-to-video, or image-to-video if a reference
// image is given). Same submit + poll pattern as image generation.
// NOTE: MuAPI video slugs/params come from muapi.ai (open-gen / API docs). If a
// model errors, adjust its slug in _packs.js VIDEO_MODELS and the params below.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { VIDEO_MODELS } = require('./_packs');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

async function muapiVideo({ model, prompt, aspect, duration, resolution, image_url }) {
  const key = process.env.MUAPI_KEY;
  const payload = { prompt, aspect_ratio: aspect, duration, resolution };
  if (image_url) payload.image_url = image_url; // image-to-video
  const submit = await fetch(`${MUAPI_BASE}/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await submit.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + submit.status));
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not return a job id');

  // Video takes longer — poll up to ~6 min.
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 3000));
    const pr = await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': key } });
    const p = await pr.json();
    if (p.status === 'completed') return { url: p.outputs && p.outputs[0], cost_usd: p.cost && p.cost.amount_usd };
    if (p.status === 'failed' || p.status === 'cancelled') throw new Error('Generation ' + p.status);
  }
  throw new Error('Timed out — please try again');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const model = body.model;
  const prompt = (body.prompt || '').trim();
  const aspect = body.aspect || '16:9';
  const duration = body.duration || '5s';
  const resolution = body.resolution || '480p';
  const image_url = (body.image_url || '').trim() || undefined;

  const cost = VIDEO_MODELS[model];
  if (!cost) return json(400, { error: 'Unknown video model.' });
  if (!prompt && !image_url) return json(400, { error: 'Add a prompt or a reference image.' });

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

  try {
    const r = await muapiVideo({ model, prompt, aspect, duration, resolution, image_url });
    if (!r.url) throw new Error('No video returned');
    await db.from('generations').insert({
      user_id: user.id, type: 'video', model, prompt, aspect,
      output_url: r.url, cost_usd: r.cost_usd, credits_spent: cost,
    });
    return json(200, { url: r.url, credits: balance, cost_usd: r.cost_usd });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'Generation failed', refunded: cost });
  }
};
