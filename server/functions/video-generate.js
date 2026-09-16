// ============================================================
// POST /.netlify/functions/video-generate   (Video Studio — async submit)
// Video renders take minutes, far longer than a function can run. So we just
// SUBMIT here (fast), store a job, and return the request_id. The browser then
// polls /job-status until it's done.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, videoCreditsForRequest, canUseFree, canUseTrial } = require('./_packs');
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
  const generate_audio = body.generate_audio !== false;
  const image_url = (body.image_url || '').trim() || undefined;
  // General image references stay capped at 4 for legacy models. Seedance 2.5
  // exposes its full multimodal reference limits separately below.
  const requestedModel = body.model || '';
  const isSeedance25 = requestedModel === 'seedance-2.5-reference-to-video';
  const extraRefs = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : [])
    .filter(Boolean)
    .slice(0, isSeedance25 ? 30 : 4);
  const referenceVideoUrls = (Array.isArray(body.reference_video_urls) ? body.reference_video_urls : []).filter(Boolean).slice(0, 10);
  const referenceAudioUrls = (Array.isArray(body.reference_audio_urls) ? body.reference_audio_urls : []).filter(Boolean).slice(0, 10);
  const referenceVideoDurations = (Array.isArray(body.reference_video_durations) ? body.reference_video_durations : [])
    .map(v => Math.max(0, Number(v) || 0))
    .slice(0, 10);
  const referenceAudioDurations = (Array.isArray(body.reference_audio_durations) ? body.reference_audio_durations : [])
    .map(v => Math.max(0, Number(v) || 0))
    .slice(0, 10);
  const allSeedanceImages = isSeedance25
    ? [image_url, ...extraRefs].filter(Boolean).filter((u, i, arr) => arr.indexOf(u) === i).slice(0, 30)
    : extraRefs;
  // Legacy models still auto-switch text -> image variants. Seedance 2.5 has
  // one internal model slug and the WaveSpeed router chooses image-to-video
  // versus multimodal reference mode based on the uploaded reference mix.
  const model = isSeedance25
    ? requestedModel
    : ((image_url || extraRefs.length) ? requestedModel.replace('text-to-video', 'image-to-video') : requestedModel);

  if (!VIDEO_MODELS[model]) return json(400, { error: 'Unknown video model.' });
  if (isSeedance25) {
    if (!prompt) return json(400, { error: 'Add a prompt for Seedance 2.5.' });
    if (!allSeedanceImages.length) return json(400, { error: 'Seedance 2.5 Image to Video needs at least one image reference.' });
    if (referenceVideoUrls.length > 10 || referenceAudioUrls.length > 10 || allSeedanceImages.length > 30) {
      return json(400, { error: 'Too many references for Seedance 2.5.' });
    }
    const totalVideoRefSeconds = referenceVideoDurations.reduce((s, v) => s + Math.max(2, Math.ceil(v || 0)), 0);
    const totalAudioRefSeconds = referenceAudioDurations.reduce((s, v) => s + Math.ceil(v || 0), 0);
    if (totalVideoRefSeconds > 30) return json(400, { error: 'Seedance 2.5 reference videos can total up to 30 seconds.' });
    if (totalAudioRefSeconds > 30) return json(400, { error: 'Seedance 2.5 reference audio can total up to 30 seconds.' });
  } else if (!prompt && !image_url) {
    return json(400, { error: 'Add a prompt or a starting image.' });
  }

  let plan = 'pro', isAdmin = false, hasPurchased = true;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; hasPurchased = p.hasPurchased; } catch (e) {}
  if (plan === 'free' && !isAdmin && !canUseFree(model)) {
    return json(403, { error: 'Video requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
  }
  // All students can use their available credits; no subscription/trial gate.

  const normalizedReferenceVideoSeconds = isSeedance25
    ? Math.min(30, referenceVideoDurations.reduce((s, v) => s + Math.max(2, Math.ceil(v || 0)), 0))
    : 0;
  const cost = videoCreditsForRequest(model, duration, resolution, {
    referenceVideoCount: isSeedance25 ? referenceVideoUrls.length : 0,
    referenceVideoSeconds: normalizedReferenceVideoSeconds,
  });
  if (!cost) return json(400, { error: 'Could not price this video model.' });

  const db = admin();
  const { data: balance, error: spendError } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (spendError) return json(500, { error: 'Could not check your credits. No generation was started.' });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    // Host references on MuAPI's CDN first (reachable by every provider),
    // start frame first. The router picks the cheapest provider for `model`
    // (WaveSpeed when its key is set, else MuAPI) and prefixes the request_id
    // so the poller knows who to ask.
    let hosted = [];
    if (!isSeedance25 && (image_url || extraRefs.length)) {
      const toHost = [];
      if (image_url) toHost.push(image_url);
      extraRefs.forEach((u) => { if (u !== image_url) toHost.push(u); });
      hosted = await Promise.all(toHost.map(muapiHostImage));
    }
    const { requestId } = await submitVideo(model, {
      prompt, aspect, duration, resolution, image_url, generate_audio,
      reference_image_urls: isSeedance25 ? allSeedanceImages : extraRefs,
      reference_video_urls: isSeedance25 ? referenceVideoUrls : [],
      reference_audio_urls: isSeedance25 ? referenceAudioUrls : [],
    }, hosted);

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
