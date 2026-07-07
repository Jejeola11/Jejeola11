// ============================================================
// POST /.netlify/functions/generate
// Auth required (Supabase Bearer token). Flow:
//   1. validate user
//   2. spend credits atomically (refunded if generation fails)
//   3. call MuAPI server-side with OUR key (user never sees it)
//   4. record the generation, return the image URL + new balance
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

// OpenAI's real image API takes a `size` string (e.g. "1024x1536"), not an
// aspect-ratio string — MuAPI's gpt-image-2 endpoint expects that native param.
// Every other model here works fine on aspect_ratio alone, so this is additive,
// scoped to gpt-image-2 only, and never removes the aspect_ratio field.
const OPENAI_SIZE = { '1:1': '1024x1024', '9:16': '1024x1536', '4:5': '1024x1536', '16:9': '1536x1024' };

// Submit a job to MuAPI and return its request_id immediately (no polling here).
async function muapiSubmit({ prompt, aspect, model, images_list, resolution }) {
  const key = process.env.MUAPI_KEY;
  const payload = { prompt, aspect_ratio: aspect };
  if (resolution) payload.resolution = resolution;
  if (images_list && images_list.length) payload.images_list = images_list;
  if (model.startsWith('gpt-image-2') && OPENAI_SIZE[aspect]) payload.size = OPENAI_SIZE[aspect];
  const submit = await fetch(`${MUAPI_BASE}/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await submit.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) {
    let m = 'Engine HTTP ' + submit.status;
    if (j && j.detail) m = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
    else if (j && (j.error || j.message)) m = (j.error && j.error.message) || j.error || j.message;
    throw new Error(m);
  }
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not return a job id');
  return id;
}

async function muapiGenerate({ prompt, aspect, model, images_list, resolution }) {
  const key = process.env.MUAPI_KEY;
  const payload = { prompt, aspect_ratio: aspect };
  if (resolution) payload.resolution = resolution;
  if (images_list && images_list.length) payload.images_list = images_list;
  const submit = await fetch(`${MUAPI_BASE}/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await submit.text();
  let j;
  try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) {
    let m = 'Engine HTTP ' + submit.status;
    if (j && j.detail) m = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
    else if (j && (j.error || j.message)) m = (j.error && j.error.message) || j.error || j.message;
    throw new Error(m);
  }
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
  try {
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
  // With references we use Nano Banana EDIT (multi-image). Plain nano-banana is text-only.
  const model = useRef ? 'nano-banana-edit' : (body.model || 'flux-schnell-image');
  if (!prompt) return json(400, { error: 'Add a prompt first.' });
  const base = IMAGE_MODELS[model];
  if (!base) return json(400, { error: 'Unknown model.' });

  // Plan gating — free users only get basic models. Default to 'pro' on any DB error so generation is never blocked by a plan-check crash.
  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  if (plan === 'free' && !isAdmin && !canUseFree(model)) {
    return json(403, { error: 'This model requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
  }

  // Reference-image editing (nano-banana-edit) is slow — always a single image, run async.
  const count = useRef ? 1 : Math.min(Math.max(parseInt(body.count, 10) || 1, 1), 4);
  const resMult = useRef ? 1 : Math.min(Math.max(parseInt(body.res, 10) || 1, 1), 3);
  const resolution = ['1k', '2k', '4k'][resMult - 1];
  const cost = base * count * resMult;

  const db = admin();

  // 1) Spend credits atomically (returns null if not enough).
  const { data: balance, error: spendErr } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (spendErr) return json(500, { error: 'Could not check your credits.' });
  if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

  // ASYNC PATH (everything): MuAPI image models can take longer than a function can
  // run. So we SUBMIT each image as a job and let the browser poll /job-status.
  // This guarantees the function returns fast (never times out to an HTML error).
  try {
    const hostedRefs = useRef ? await Promise.all(refs.map(muapiHostImage)) : undefined;
    const perCredits = Math.max(1, Math.round(cost / count));
    let firstError = null;
    const submits = await Promise.all(Array.from({ length: count }, () =>
      muapiSubmit({ prompt, aspect, model, images_list: hostedRefs, resolution: resMult > 1 ? resolution : undefined })
        .then((id) => id).catch((e) => { if (!firstError) firstError = e; return null; })));
    const ids = submits.filter(Boolean);
    // Surface the real engine error (e.g. a param the model rejected) instead of
    // a generic message — critical for spotting a genuinely broken model fast.
    if (!ids.length) throw firstError || new Error('Engine did not start the job');

    const rows = ids.map((id) => ({ request_id: id, user_id: user.id, kind: 'image', model, prompt, aspect, credits: perCredits, status: 'processing' }));
    await db.from('jobs').insert(rows);

    // Refund any submissions that failed to start.
    const refund = (count - ids.length) * perCredits;
    if (refund > 0) await db.rpc('add_credits', { uid: user.id, amount: refund, why: 'refund' });

    return json(200, { request_ids: ids, request_id: ids[0], credits: balance + refund, watermark: plan === 'free' && !isAdmin });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Generation failed', refunded: cost });
  }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
