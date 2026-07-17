// ============================================================
// POST /.netlify/functions/avatar-generate   (AI Avatar Studio — async submit)
// Auth required. Body: { avatar_id, prompt, aspect, extra_refs[] }
// GPT Image 2 can take 30-90s, far longer than a function can run. So we
// SUBMIT here (fast), store a job, and return the request_id. The browser then
// polls /job-status until it's done — exactly like video.
//
// Was nano-banana-edit — switched 2026-07-16 after it stopped holding face
// identity consistently. Verified live against this account: the real edit
// slug is `gpt-image-2-image-to-image` (not `gpt-image-2-edit`, which 404s),
// takes `prompt` + `images_list` (confirmed up to 20 images accepted, no
// need for the old 4-image cap) + optional `aspect_ratio`/`size`.
//
// Routed through WaveSpeed now (was still hardcoded straight to MuAPI even
// after Flyer Studio's identical GPT Image 2 edit call moved over — missed
// in that migration, found 2026-07-17). Same submitFlyerImage() WaveSpeed
// path flyer-hero.js/flyer-layer.js use, same MuAPI fallback if
// WAVESPEED_KEY isn't set.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');

const AVATAR_COST = 10;
const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL_WS = 'gpt-image-2-ws-edit';
const MODEL_MUAPI = 'gpt-image-2-image-to-image';
const OPENAI_SIZE = { '1:1': '1024x1024', '9:16': '1024x1536', '4:5': '1024x1536', '16:9': '1536x1024' };

function muapiError(j, status) {
  if (j && j.detail) {
    if (Array.isArray(j.detail)) return j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ');
    if (typeof j.detail === 'string') return j.detail;
    return JSON.stringify(j.detail);
  }
  if (j && j.error) return (j.error.message || j.error);
  return 'Engine HTTP ' + status;
}

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY && !hasWaveSpeed()) return json(503, { error: 'Engine not connected (WAVESPEED_KEY/MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const scene = (body.prompt || '').trim();
    const aspect = body.aspect || '9:16';
    if (!scene) return json(400, { error: 'Describe the scene you want.' });

    // Extra reference images (e.g. a product bottle) — up to 3.
    const extraRefs = (Array.isArray(body.extra_refs) ? body.extra_refs : []).filter(Boolean).slice(0, 3);

    db = admin();
    const { data: avatar } = await db.from('avatars').select('image_url, image_urls, model_sheet_url, user_id').eq('id', body.avatar_id).maybeSingle();
    if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });

    // Ground every generation in BOTH the model sheet (controlled, multi-angle)
    // AND the raw training photos (real, unprocessed) — this is what "clone my
    // exact face throughout" means in practice: more real signal of the actual
    // face, not just one synthetic reference doing all the work.
    const rawPhotos = (Array.isArray(avatar.image_urls) && avatar.image_urls.length) ? avatar.image_urls
      : (avatar.image_url ? [avatar.image_url] : []);
    const faceImgs = [avatar.model_sheet_url, ...rawPhotos].filter(Boolean);
    if (!faceImgs.length) return json(400, { error: 'This avatar has no photos.' });

    // Capped at 8 (not the 20 GPT Image 2 itself would accept) — re-hosting
    // every reference concurrently on MuAPI's CDN inside one function call
    // risks exceeding Netlify's execution time limit with a full 15-photo
    // avatar, which surfaces to the browser as a bare "Failed to fetch"
    // rather than a real error message.
    const faceSlots = Math.max(1, 8 - extraRefs.length);
    const refs = faceImgs.slice(0, faceSlots).concat(extraRefs);

    // Strong identity lock — the model sheet (if present) is listed first as
    // the primary reference; the rest reinforce the same face from real photos.
    const hasSheet = !!avatar.model_sheet_url;
    const identity = hasSheet
      ? 'CRITICAL FACE LOCK: the subject\'s face MUST be identical to the person shown across ALL the reference images (the character model sheet plus their real photos) — the SAME real person, not a resemblance. Match face shape, jawline, eyes, eyebrows, nose, lips, skin tone and complexion exactly. Do NOT invent a new face, do NOT beautify, slim, lighten, or change the ethnicity or age. This must look like the same real person photographed again in a new scene, not a similar-looking stand-in.'
      : 'CRITICAL FACE LOCK: keep the EXACT same face and identity as the person shown across ALL the reference photos — same facial features, face shape, eyes, nose, lips, skin tone. Do not alter, beautify, or approximate their face — it must be the same real person.';
    const realism = ' Hyper-realistic, like a real DSLR photograph — natural skin texture with visible pores and subtle imperfections, realistic asymmetry, no plastic or airbrushed or AI look, no smoothing. Only change the scene, outfit and pose as described; the face stays the same.';
    const extraNote = extraRefs.length ? ' Naturally include the product/object shown in the additional reference image(s) in the scene, held or placed realistically.' : '';
    const prompt = `${scene}. ${identity}${realism}${extraNote}`;

    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: AVATAR_COST });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: AVATAR_COST, code: 'NO_CREDITS' });
    cost = AVATAR_COST;

    // Host all refs so the engine can always fetch them, then SUBMIT.
    const hosted = await Promise.all(refs.map(muapiHostImage));
    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? MODEL_WS : MODEL_MUAPI;

    let id;
    if (wantsWS) {
      const r = await submitFlyerImage(model, { prompt, aspect, images: hosted });
      if (!r) throw new Error('WaveSpeed did not start the job');
      id = r.requestId;
    } else {
      const payload = { prompt, aspect_ratio: aspect, images_list: hosted };
      if (OPENAI_SIZE[aspect]) payload.size = OPENAI_SIZE[aspect];
      const sub = await fetch(`${MUAPI_BASE}/${model}`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await sub.json();
      if (!sub.ok) throw new Error(muapiError(j, sub.status));
      id = j.request_id || j.id;
    }
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'avatar', model, prompt: scene, aspect, credits: AVATAR_COST, status: 'processing' });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start generation', refunded: cost });
  }
};
