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
//
// Routed through submitAvatar() (_providers.js) now, which already had a
// working WaveSpeed AVATAR_ROUTES entry for all three of these models —
// this endpoint was just still calling MuAPI directly instead of using it
// (found in the same audit that caught avatar-generate.js/avatar-
// modelsheet.js, 2026-07-17).
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree, canUseTrial } = require('./_packs');
const { muapiHostFile } = require('./_muapi');
const { submitAvatar } = require('./_providers');

const ALLOWED = ['omnihuman-1-5', 'kling-v2-avatar-pro', 'kling-v2-avatar-standard'];

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

    let plan = 'pro', isAdmin = false, hasPurchased = true;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; hasPurchased = p.hasPurchased; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'AI Talking Avatar requires a subscription. Upgrade to unlock it.', code: 'PLAN_REQUIRED' });
    }
    if (plan === 'free' && !isAdmin && !hasPurchased && !canUseTrial(model)) {
      return json(403, { error: 'Free trial credits only cover our starter models. Buy a credit pack to unlock every model.', code: 'TRIAL_TIER_ONLY' });
    }

    const cost = VIDEO_MODELS[model];
    const db = admin();
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

    try {
      const hostedImage = await muapiHostFile(image_url, 'image');
      const hostedAudio = await muapiHostFile(audio_url, 'audio');
      const { requestId } = await submitAvatar(model, { image: hostedImage, audio: hostedAudio });
      if (!requestId) throw new Error('Engine did not start the job');

      await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'video', model, prompt: '(talking avatar)', aspect: '9:16', credits: cost, status: 'processing' });
      return json(200, { request_id: requestId, credits: balance });
    } catch (e) {
      const msg = e.message || 'Could not start the video';
      try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
      try { await db.from('jobs').insert({ request_id: 'failed-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8), user_id: user.id, kind: 'video', model, prompt: '(talking avatar)', aspect: '9:16', credits: cost, status: 'failed', error_message: msg }); } catch (_) {}
      return json(502, { error: msg, refunded: cost });
    }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
