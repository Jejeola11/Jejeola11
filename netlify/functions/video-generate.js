// ============================================================
// POST /.netlify/functions/video-generate   (Video Studio — async submit)
// Video renders take minutes, far longer than a function can run. So we just
// SUBMIT here (fast), store a job, and return the request_id. The browser then
// polls /job-status until it's done.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitVideo } = require('./_providers');

exports.handler = async (event) => {
  try {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const prompt = (body.prompt || '').trim();
  const aspect = body.aspect || '16:9';
  const duration = body.duration || '5s';
  const resolution = body.resolution || '480p';
  const image_url = (body.image_url || '').trim() || undefined;
  // Extra reference images (subject / product / style) — up to 4.
  const extraRefs = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : []).filter(Boolean).slice(0, 4);
  // Attaching a start image OR any reference switches to the image-to-video variant.
  const model = (image_url || extraRefs.length) ? (body.model || '').replace('text-to-video', 'image-to-video') : body.model;

  if (!VIDEO_MODELS[model]) return json(400, { error: 'Unknown video model.' });
  if (!prompt && !image_url) return json(400, { error: 'Add a prompt or a starting image.' });

  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  if (plan === 'free' && !isAdmin && !canUseFree(model)) {
    return json(403, { error: 'Video requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
  }

  const durMult = String(duration).startsWith('10') ? 2 : 1;
  const cost = VIDEO_MODELS[model] * durMult;

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    // Host references on MuAPI's CDN first (reachable by every provider),
    // start frame first. The router picks the cheapest provider for `model`
    // (WaveSpeed when its key is set, else MuAPI) and prefixes the request_id
    // so the poller knows who to ask.
    let hosted = [];
    if (image_url || extraRefs.length) {
      const toHost = [];
      if (image_url) toHost.push(image_url);
      extraRefs.forEach((u) => { if (u !== image_url) toHost.push(u); });
      hosted = await Promise.all(toHost.map(muapiHostImage));
    }
    const { requestId } = await submitVideo(model, { prompt, aspect, duration, resolution, image_url }, hosted);

    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'video', model, prompt, aspect, credits: cost, status: 'processing' });
    return json(200, { request_id: requestId, credits: balance });
  } catch (e) {
    const msg = typeof e.message === 'string' ? e.message : 'Could not start video';
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    try {
      if (db && user) await db.from('jobs').insert({
        request_id: 'failed-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
        user_id: user.id, kind: 'video', model, prompt, aspect, credits: cost,
        status: 'failed', error_message: msg,
      });
    } catch (_) {}
    return json(502, { error: msg, refunded: cost });
  }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
