// ============================================================
// POST /.netlify/functions/talking-avatar   (Omni Studio — AI Talking Avatar)
// Turns a portrait image + an audio clip into a talking-head video. Two
// models to pick from (both confirmed live on MuAPI, 2026-07-02):
//   omnihuman-1-5          — fast & cheap, great default
//   kling-v2-avatar-pro    — premium tier, higher fidelity
//   kling-v2-avatar-standard — mid tier
// (Hedra was requested too but isn't in MuAPI's catalog — these three were
// confirmed available instead.)
//
// Field names confirmed via a clean MuAPI validation error (no plan gate, no
// charge): both families require 'image_url' and 'audio_url' (singular).
// Async submit -> poll via the shared job-status.js (kind:'video').
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree } = require('./_packs');
const { muapiHostFile } = require('./_muapi');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const ALLOWED = ['omnihuman-1-5', 'kling-v2-avatar-pro', 'kling-v2-avatar-standard'];

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
    const model = ALLOWED.includes(body.model) ? body.model : 'omnihuman-1-5';
    const image_url = (body.image_url || '').trim();
    const audio_url = (body.audio_url || '').trim();
    if (!image_url) return json(400, { error: 'Add a portrait image.' });
    if (!audio_url) return json(400, { error: 'Add an audio clip.' });

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'AI Talking Avatar requires a subscription. Upgrade to unlock it.', code: 'PLAN_REQUIRED' });
    }

    const cost = VIDEO_MODELS[model];
    const db = admin();
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

    try {
      const hostedImage = await muapiHostFile(image_url, 'image');
      const hostedAudio = await muapiHostFile(audio_url, 'audio');
      const payload = { image_url: hostedImage, audio_url: hostedAudio };

      const sub = await fetch(`${MUAPI_BASE}/${model}`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await sub.json();
      if (!sub.ok) throw new Error(muapiError(j, sub.status));
      const id = j.request_id || j.id;
      if (!id) throw new Error('Engine did not start the job');

      await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'video', model, prompt: '(talking avatar)', aspect: '9:16', credits: cost, status: 'processing' });
      return json(200, { request_id: id, credits: balance });
    } catch (e) {
      try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
      return json(502, { error: e.message || 'Could not start the video', refunded: cost });
    }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
