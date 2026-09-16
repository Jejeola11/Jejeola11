// ============================================================
// POST /api/video-generate   (Video Studio — async submit)
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
    const resolution = body.resolution || '720p';
    const generate_audio = body.generate_audio !== false;
    const requestedModel = body.model || '';

    const image_url = (body.image_url || '').trim() || undefined;
    const extraImages = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : []).filter(Boolean);
    const referenceVideoUrls = (Array.isArray(body.reference_video_urls) ? body.reference_video_urls : []).filter(Boolean);
    const referenceAudioUrls = (Array.isArray(body.reference_audio_urls) ? body.reference_audio_urls : []).filter(Boolean);
    const referenceVideoDurations = (Array.isArray(body.reference_video_durations) ? body.reference_video_durations : [])
      .map(v => Math.max(0, Number(v) || 0));
    const referenceAudioDurations = (Array.isArray(body.reference_audio_durations) ? body.reference_audio_durations : [])
      .map(v => Math.max(0, Number(v) || 0));

    const isSeedance25 = requestedModel === 'seedance-2.5-image-to-video' || requestedModel === 'seedance-2.5-text-to-video';

    const allSeedanceImages = isSeedance25
      ? [image_url, ...extraImages].filter(Boolean).filter((u, i, arr) => arr.indexOf(u) === i)
      : extraImages.slice(0, 4);

    const totalSeedanceRefs = allSeedanceImages.length + referenceVideoUrls.length + referenceAudioUrls.length;

    let model;
    if (isSeedance25) {
      if (!prompt) return json(400, { error: 'Add a prompt for Seedance 2.5.' });
      if (totalSeedanceRefs > 6) {
        return json(400, { error: 'Seedance 2.5 supports up to 6 references in Fuse.' });
      }

      const seconds = parseInt(duration, 10) || 5;
      if (seconds < 4 || seconds > 30) {
        return json(400, { error: 'Seedance 2.5 duration must be between 4 and 30 seconds.' });
      }
      if (!['480p', '720p', '1080p', '4k'].includes(resolution)) {
        return json(400, { error: 'Seedance 2.5 supports 480p, 720p, 1080p, or 4K.' });
      }

      const totalVideoRefSeconds = referenceVideoDurations.reduce((s, v) => s + Math.max(2, Math.ceil(v || 0)), 0);
      const totalAudioRefSeconds = referenceAudioDurations.reduce((s, v) => s + Math.ceil(v || 0), 0);
      if (totalVideoRefSeconds > 30) {
        return json(400, { error: 'Seedance 2.5 reference videos can total up to 30 seconds.' });
      }
      if (totalAudioRefSeconds > 30) {
        return json(400, { error: 'Seedance 2.5 reference audio can total up to 30 seconds.' });
      }

      // Preserve exact I2V behavior for a start image (+ optional last frame).
      // Switch to Seedance 2.5's official reference-guided T2V route when
      // the user adds 3+ images or any video/audio reference.
      const needsReferenceRoute =
        referenceVideoUrls.length > 0 ||
        referenceAudioUrls.length > 0 ||
        allSeedanceImages.length > 2 ||
        allSeedanceImages.length === 0;

      model = needsReferenceRoute
        ? 'seedance-2.5-text-to-video'
        : 'seedance-2.5-image-to-video';
    } else {
      model = (image_url || extraImages.length)
        ? requestedModel.replace('text-to-video', 'image-to-video')
        : requestedModel;
    }

    if (!VIDEO_MODELS[model]) return json(400, { error: 'Unknown video model.' });

    if (!isSeedance25 && !prompt && !image_url) {
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

    const normalizedReferenceVideoSeconds = isSeedance25
      ? Math.min(30, referenceVideoDurations.reduce((s, v) => s + Math.max(2, Math.ceil(v || 0)), 0))
      : 0;

    const cost = videoCreditsForRequest(model, duration, resolution, {
      referenceVideoCount: isSeedance25 ? referenceVideoUrls.length : 0,
      referenceVideoSeconds: normalizedReferenceVideoSeconds,
    });
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
        // Fuse uploads refs to a public Supabase bucket, so WaveSpeed can use
        // those URLs directly. For I2V hosted[0] = start and hosted[1] = end.
        hosted = allSeedanceImages.slice(0, 2);
      } else if (image_url || extraImages.length) {
        const toHost = [];
        if (image_url) toHost.push(image_url);
        extraImages.slice(0, 4).forEach((u) => { if (u !== image_url) toHost.push(u); });
        hosted = await Promise.all(toHost.map(muapiHostImage));
      }

      const { requestId } = await submitVideo(model, {
        prompt,
        aspect,
        duration,
        resolution,
        image_url,
        generate_audio,
        reference_image_urls: isSeedance25 ? allSeedanceImages.slice(0, 6) : extraImages.slice(0, 4),
        reference_video_urls: isSeedance25 ? referenceVideoUrls.slice(0, 6) : [],
        reference_audio_urls: isSeedance25 ? referenceAudioUrls.slice(0, 6) : [],
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

      return json(200, {
        request_id: requestId,
        credits: balance,
        charged: cost,
        routed_model: model
      });
    } catch (e) {
      const msg = typeof e.message === 'string' ? e.message : 'Could not start video';
      try {
        await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
      } catch (_) {}
      try {
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
      } catch (_) {}
      return json(502, { error: msg, refunded: cost });
    }
  } catch (fatal) {
    console.error('[video-generate]', fatal);
    return json(500, { error: 'Server error — please try again.' });
  }
};
