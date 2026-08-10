// ============================================================
// POST /.netlify/functions/omni-reference   (Omni Studio — Seedance 2 Omni Reference)
// Generates video with visual/character consistency from up to 9 reference
// images and up to 3 reference audio clips, plus a text prompt. Async submit
// -> poll via the shared job-status.js (kind:'video').
//
// Model: seedance-2-omni-reference-no-video — confirmed LIVE and working on
// this account (2026-07-02); the plain 'seedance-2-omni-reference' slug
// currently 404s on MuAPI even though it's listed in their catalog, so this
// -no-video variant is the correct, tested choice (it matches the ask: image
// + audio references, no source video needed).
//
// Field names confirmed via a completed test job's echoed input schema:
// 'prompt' (required), 'images_list' (array), 'audio_files' (array). Matches
// the same 'images_list' convention already used elsewhere in this codebase
// (video-generate.js).
//
// Now tries WaveSpeed first — google/gemini-omni-flash/reference-to-video,
// found live in WaveSpeed's own model catalog 2026-07-17 (an earlier search
// for an omni-reference equivalent there came up empty; this one matches
// the same "video with visual consistency from reference images" ask).
// Required fields confirmed via clean validation errors: images, prompt.
// Audio-reference support is NOT confirmed on this WaveSpeed route — falls
// back to MuAPI whenever audio references are attached, since that's the
// one part of this feature not verified to carry over.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree, canUseTrial } = require('./_packs');
const { muapiHostFile } = require('./_muapi');
const { submitOmniReference, hasWaveSpeed } = require('./_providers');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'seedance-2-omni-reference-no-video';

function muapiError(j, status) {
  if (j && j.detail) {
    if (Array.isArray(j.detail)) return j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ');
    if (typeof j.detail === 'string') return j.detail;
    return JSON.stringify(j.detail);
  }
  return 'Engine HTTP ' + status;
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const prompt = (body.prompt || '').trim();
    const images = (Array.isArray(body.image_urls) ? body.image_urls : []).filter(Boolean).slice(0, 9);
    const audios = (Array.isArray(body.audio_urls) ? body.audio_urls : []).filter(Boolean).slice(0, 3);
    const aspect = body.aspect || '9:16';
    if (!prompt) return json(400, { error: 'Describe the video you want.' });

    let plan = 'pro', isAdmin = false, hasPurchased = true;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; hasPurchased = p.hasPurchased; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
      return json(403, { error: 'Seedance 2 Omni requires a subscription. Upgrade to unlock it.', code: 'PLAN_REQUIRED' });
    }
    if (plan === 'free' && !isAdmin && !hasPurchased && !canUseTrial(MODEL)) {
      return json(403, { error: 'Free trial credits only cover our starter models. Buy a credit pack to unlock every model.', code: 'TRIAL_TIER_ONLY' });
    }

    const cost = VIDEO_MODELS[MODEL];
    const db = admin();
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

    try {
      const hostedImages = images.length ? await Promise.all(images.map((u) => muapiHostFile(u, 'image'))) : [];
      const wantsWS = hasWaveSpeed() && !audios.length; // audio refs aren't confirmed on the WaveSpeed route yet
      let id;
      if (wantsWS && hostedImages.length) {
        const r = await submitOmniReference({ images: hostedImages, prompt, aspect });
        id = r.requestId;
      } else {
        const payload = { prompt, aspect_ratio: aspect };
        if (hostedImages.length) payload.images_list = hostedImages;
        if (audios.length) payload.audio_files = await Promise.all(audios.map((u) => muapiHostFile(u, 'audio')));

        const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
          method: 'POST',
          headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const j = await sub.json();
        if (!sub.ok) throw new Error(muapiError(j, sub.status));
        id = j.request_id || j.id;
      }
      if (!id) throw new Error('Engine did not start the job');

      await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'video', model: MODEL, prompt, aspect, credits: cost, status: 'processing' });
      return json(200, { request_id: id, credits: balance });
    } catch (e) {
      const msg = e.message || 'Could not start the generation';
      try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
      try { await db.from('jobs').insert({ request_id: 'failed-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), user_id: user.id, kind: 'video', model: MODEL, prompt, aspect, credits: cost, status: 'failed', error_message: msg }); } catch (_) {}
      return json(502, { error: msg, refunded: cost });
    }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
