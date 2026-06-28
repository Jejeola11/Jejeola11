// ============================================================
// POST /.netlify/functions/avatar-generate   (AI Avatar Studio — async submit)
// Auth required. Body: { avatar_id, prompt, aspect, extra_refs[] }
// nano-banana-edit can take 30-90s, far longer than a function can run. So we
// SUBMIT here (fast), store a job, and return the request_id. The browser then
// polls /job-status until it's done — exactly like video.
// IMPORTANT: nano-banana = text-to-image (ignores refs). nano-banana-edit USES images_list.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { muapiHostImage } = require('./_muapi');

const AVATAR_COST = 10;
const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

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
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Engine not connected (MUAPI_KEY missing).' });

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
    // Prefer the model sheet (canonical multi-angle reference) for best consistency.
    const faceImgs = avatar.model_sheet_url
      ? [avatar.model_sheet_url]
      : ((Array.isArray(avatar.image_urls) && avatar.image_urls.length) ? avatar.image_urls
        : (avatar.image_url ? [avatar.image_url] : []));
    if (!faceImgs.length) return json(400, { error: 'This avatar has no photos.' });

    // nano-banana-edit accepts max 4 reference images. The model sheet counts as one
    // strong reference; leave room for the extra refs.
    const faceSlots = Math.max(1, 4 - extraRefs.length);
    const refs = faceImgs.slice(0, faceSlots).concat(extraRefs);

    // Strong identity-preservation prompt — this is what keeps the face consistent.
    const identity = 'Keep the EXACT same face, identity, bone structure and facial features as the person shown in the reference photos — do not alter their face, only change the scene/outfit/pose as described. Photorealistic, identical consistent face, ultra-detailed natural skin texture, sharp focus.';
    const extraNote = extraRefs.length ? ' Include the product/object from the additional reference image(s) naturally in the scene.' : '';
    const prompt = `${scene}. ${identity}${extraNote}`;

    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: AVATAR_COST });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: AVATAR_COST, code: 'NO_CREDITS' });
    cost = AVATAR_COST;

    // Host all refs on MuAPI CDN so the engine can always fetch them, then SUBMIT.
    const hosted = await Promise.all(refs.map(muapiHostImage));
    const sub = await fetch(`${MUAPI_BASE}/nano-banana-edit`, {
      method: 'POST',
      headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, aspect_ratio: aspect, images_list: hosted }),
    });
    const j = await sub.json();
    if (!sub.ok) throw new Error(muapiError(j, sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'avatar', model: 'nano-banana-edit', prompt: scene, aspect, credits: AVATAR_COST, status: 'processing' });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start generation', refunded: cost });
  }
};
