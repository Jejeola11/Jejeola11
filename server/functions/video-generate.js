// ============================================================
// POST /api/video-generate   (Video Studio — async submit)
// Video renders take minutes, so this endpoint only validates, charges,
// submits, stores the job, and returns the request_id for /job-status polling.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, videoCreditsForRequest, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitVideo } = require('./_providers');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body;
    try { body = JSON.parse(event.body || '{}'); }
    catch (e) { return json(400, { error: 'Bad request' }); }

    const prompt = (body.prompt || '').trim();
    const aspect = body.aspect || '16:9';
    const duration = body.duration || '5s';
    const resolution = body.resolution || '480p';
    const generate_audio = body.generate_audio !== false;
    const image_url = (body.image_url || '').trim() || undefined;
    const requestedModel = body.model || '';
    const isSeedance25 = requestedModel === 'seedance-2.5-image-to-video';

    // Generic video models may accept several image refs. Exact WaveSpeed
    // Seedance 2.5 I2V accepts one required start image plus one optional
    // last_image, so only one additional image is accepted for that model.
    const extraRefs = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : [])
      .filter(Boolean)
      .slice(0, isSeedance25 ? 1 : 4);

    const model = isSeedance25
      ? requestedModel
      : ((image_url || extraRefs.length)
          ? requestedModel.replace('text-to-video', 'image-to-video')
          : requestedModel);

    if (!VIDEO_MODELS[model]) return json(400, { error: 'Unknown video model.' });

    if (isSeedance25) {
      if (!prompt) return json(400, { error: 'Add a prompt for Seedance 2.5.' });
      if (!image_url) return json(400, { error: 'Seedance 2.5 Image to Video requires a start image.' });

      const seconds = parseInt(duration, 10) || 5;
      if (seconds < 4 || seconds > 30) {
        return json(400, { error: 'Seedance 2.5 duration must be between 4 and 30 seconds.' });
      }
      if (!['480p', '720p', '1080p', '4k'].includes(resolution)) {
        return json(400, { error: 'Seedance 2.5 supports 480p, 720p, 1080p, or 4K.' });
      }
    } else if (!prompt && !image_url) {
      return json(400, { error: 'Add a prompt or a starting image.' });
    }

    let plan = 'pro', isAdmin = false;
    try {
      const p = await getPlan(user.id);
      plan = p.plan;
      isAdmin = p.isAdmin;
    } catch (e) {}

    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, {
        error: 'Video requires a subscription. Upgrade to unlock all models.',
        code: 'PLAN_REQUIRED'
      });
    }

    // Server-side pricing is authoritative. Seedance 2.5 is charged from
    // WaveSpeed's published per-second resolution rates in _packs.js.
    const cost = videoCreditsForRequest(model, duration, resolution);
    if (!cost) return json(400, { error: 'Could not price this video model.' });

    const db = admin();
    const { data: balance, error: spendError } = await db.rpc('spend_credits', {
      uid: user.id,
      amount: cost
    });
    if (spendError) return json(500, {
      error: 'Could not check your credits. No generation was started.'
    });
    if (balance === null) return json(402, {
      error: 'Not enough credits.',
      code: 'NO_CREDITS'
    });

    try {
      let hosted = [];

      if (isSeedance25) {
        // These are already public Supabase URLs from Video Create. WaveSpeed
        // can read them directly, and avoiding MuAPI keeps this route truly
        // WaveSpeed-only. Position 0 = image, position 1 = optional last_image.
        hosted = [image_url, ...extraRefs].filter(Boolean).slice(0, 2);
      } else if (image_url || extraRefs.length) {
        const toHost = [];
        if (image_url) toHost.push(image_url);
        extraRefs.forEach((u) => { if (u !== image_url) toHost.push(u); });
        hosted = await Promise.all(toHost.map(muapiHostImage));
      }

      const { requestId } = await submitVideo(model, {
        prompt,
        aspect,
        duration,
        resolution,
        image_url,
        generate_audio,
        reference_image_urls: extraRefs,
      }, hosted);

      await db.from('jobs').insert({
        request_id: requestId,
        user_id: user.id,
        kind: 'video',
        model,
        prompt,
        aspect,
        credits: cost,
        status: 'processing'
      });

      return json(200, { request_id: requestId, credits: balance, charged: cost });
    } catch (e) {
      const msg = typeof e.message === 'string' ? e.message : 'Could not start video';
      try {
        if (db && user && cost) {
          await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
        }
      } catch (_) {}
      try {
        if (db && user) {
          await db.from('jobs').insert({
            request_id: 'failed-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            user_id: user.id,
            kind: 'video',
            model,
            prompt,
            aspect,
            credits: cost,
            status: 'failed',
            error_message: msg,
          });
        }
      } catch (_) {}
      return json(502, { error: msg, refunded: cost });
    }
  } catch (fatal) {
    console.error('[video-generate]', fatal);
    return json(500, { error: 'Server error — please try again.' });
  }
};
