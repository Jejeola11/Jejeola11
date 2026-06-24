// ============================================================
// POST /.netlify/functions/generate
// Auth required (Supabase Bearer token). Flow:
//   1. validate user
//   2. spend credits atomically (refunded if generation fails)
//   3. call MuAPI server-side with OUR key (user never sees it)
//   4. record the generation, return the image URL + new balance
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { IMAGE_MODELS } = require('./_packs');
const { muapiHostImage } = require('./_muapi');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

async function muapiGenerate({ prompt, aspect, model, image_urls, resolution }) {
  const key = process.env.MUAPI_KEY;
  const payload = { prompt, aspect_ratio: aspect };
  if (resolution) payload.resolution = resolution;
  if (image_urls && image_urls.length) payload.image_urls = image_urls; // reference image(s)
  const submit = await fetch(`${MUAPI_BASE}/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await submit.text();
  let j;
  try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + submit.status));
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not return a job id');

  // Poll for the result (up to ~3.5 min).
  for (let i = 0; i < 85; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const pr = await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': key } });
    const p = await pr.json();
    if (p.status === 'completed') {
      return { url: p.outputs && p.outputs[0], cost_usd: p.cost && p.cost.amount_usd };
    }
    if (p.status === 'failed' || p.status === 'cancelled') {
      throw new Error('Generation ' + p.status);
    }
  }
  throw new Error('Timed out — please try again');
}

// Image-to-image with a user reference (via fal). Used when a reference is attached.
const FAL_SIZE = { '9:16': 'portrait_16_9', '1:1': 'square_hd', '4:5': 'portrait_4_3', '16:9': 'landscape_16_9' };
async function falImg2Img({ prompt, image_url, aspect }) {
  const headers = { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' };
  const sub = await fetch('https://queue.fal.run/fal-ai/flux/dev/image-to-image', {
    method: 'POST', headers,
    body: JSON.stringify({ prompt, image_url, strength: 0.85, image_size: FAL_SIZE[aspect] || 'portrait_16_9' }),
  });
  const sd = await sub.json();
  if (!sub.ok) throw new Error((sd.detail && JSON.stringify(sd.detail)) || sd.error || ('Engine HTTP ' + sub.status));
  if (!sd.status_url) throw new Error('No job started');
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const st = await (await fetch(sd.status_url, { headers })).json();
    if (st.status === 'COMPLETED') {
      const out = await (await fetch(sd.response_url, { headers })).json();
      return { url: out.images && out.images[0] && out.images[0].url };
    }
    if (st.status === 'FAILED' || st.status === 'ERROR') throw new Error('Generation failed');
  }
  throw new Error('Timed out — please try again');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const prompt = (body.prompt || '').trim();
  const aspect = body.aspect || '9:16';
  // Collect 0..N reference images (multi-image editing/blending via Nano Banana).
  const refs = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls
    : (body.reference_image_url ? [body.reference_image_url] : [])).filter(Boolean);
  const useRef = refs.length > 0;
  // With references we use Nano Banana (multi-image). Otherwise the chosen model.
  const model = useRef ? 'nano-banana' : (body.model || 'flux-schnell-image');
  if (!prompt) return json(400, { error: 'Add a prompt first.' });
  const base = IMAGE_MODELS[model];
  if (!base) return json(400, { error: 'Unknown model.' });

  const count = Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 4);
  const resMult = Math.min(Math.max(parseInt(body.res, 10) || 1, 1), 3);
  const resolution = ['1k', '2k', '4k'][resMult - 1];
  const cost = base * count * resMult;

  const db = admin();

  // 1) Spend credits atomically (returns null if not enough).
  const { data: balance, error: spendErr } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (spendErr) return json(500, { error: 'Could not check your credits.' });
  if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

  // 2) Generate `count` images in parallel. Refund if all fail.
  try {
    // Re-host reference images on MuAPI so the engine can always fetch them.
    const hostedRefs = useRef ? await Promise.all(refs.map(muapiHostImage)) : undefined;
    const jobs = Array.from({ length: count }, () =>
      muapiGenerate({ prompt, aspect, model, image_urls: hostedRefs, resolution: resMult > 1 ? resolution : undefined })
        .catch(() => null));
    const results = await Promise.all(jobs);
    const urls = results.filter((r) => r && r.url).map((r) => r.url);
    if (!urls.length) throw new Error('No image returned');

    const rows = urls.map((u) => ({ user_id: user.id, type: 'image', model, prompt, aspect, output_url: u, credits_spent: Math.round(cost / urls.length) }));
    await db.from('generations').insert(rows);

    // Partial refund if fewer images came back than paid for.
    const refund = (count - urls.length) * base * resMult;
    if (refund > 0) await db.rpc('add_credits', { uid: user.id, amount: refund, why: 'refund' });

    return json(200, { urls, url: urls[0], credits: balance + refund });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'Generation failed', refunded: cost });
  }
};
