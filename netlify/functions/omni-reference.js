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
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree } = require('./_packs');
const { muapiHostFile } = require('./_muapi');

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

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
      return json(403, { error: 'Seedance 2 Omni requires a subscription. Upgrade to unlock it.', code: 'PLAN_REQUIRED' });
    }

    const cost = VIDEO_MODELS[MODEL];
    const db = admin();
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

    try {
      const payload = { prompt, aspect_ratio: aspect };
      if (images.length) payload.images_list = await Promise.all(images.map((u) => muapiHostFile(u, 'image')));
      if (audios.length) payload.audio_files = await Promise.all(audios.map((u) => muapiHostFile(u, 'audio')));

      const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await sub.json();
      if (!sub.ok) throw new Error(muapiError(j, sub.status));
      const id = j.request_id || j.id;
      if (!id) throw new Error('Engine did not start the job');

      await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'video', model: MODEL, prompt, aspect, credits: cost, status: 'processing' });
      return json(200, { request_id: id, credits: balance });
    } catch (e) {
      try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
      return json(502, { error: e.message || 'Could not start the generation', refunded: cost });
    }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
