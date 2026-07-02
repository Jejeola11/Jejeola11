// ============================================================
// POST /.netlify/functions/omni-video-edit   (Omni Studio — Gemini Omni Video Edit)
// Video-to-video editing: restyle/relight/swap subjects/rewrite scenes from up
// to 10 source clips with a single instruction prompt, plus an optional audio
// track. Async submit -> poll via the shared job-status.js (kind:'video').
//
// Field names confirmed live against MuAPI (2026-07-02): 'prompt' is required.
// 'video_urls' (plural) matches the confirmed convention on the sibling
// gemini-omni-image-to-video model. 'audio_urls' (plural) is a best-effort
// match to that same convention — it could not be confirmed directly because
// this account isn't yet on the required MuAPI plan (see note below), so
// double-check once upgraded.
//
// IMPORTANT: as of the same check, MuAPI returned:
//   "Gemini Omni is available only on the Pro and Business plans."
// This function will return that exact error until the MuAPI account is
// upgraded. Everything else (credits, UI, polling) is fully wired and ready.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree } = require('./_packs');
const { muapiHostFile } = require('./_muapi');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'gemini-omni-video-edit';

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
    const prompt = (body.instructions || body.prompt || '').trim();
    const clips = (Array.isArray(body.video_urls) ? body.video_urls : []).filter(Boolean).slice(0, 10);
    const audio_url = (body.audio_url || '').trim() || undefined;
    if (!prompt) return json(400, { error: 'Describe the edit you want.' });
    if (!clips.length) return json(400, { error: 'Add at least one video clip.' });

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
      return json(403, { error: 'Gemini Omni Edit requires a subscription. Upgrade to unlock it.', code: 'PLAN_REQUIRED' });
    }

    const cost = VIDEO_MODELS[MODEL];
    const db = admin();
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

    try {
      const hostedClips = await Promise.all(clips.map((u) => muapiHostFile(u, 'video')));
      const payload = { prompt, video_urls: hostedClips };
      if (audio_url) payload.audio_urls = [await muapiHostFile(audio_url, 'audio')];

      const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
        method: 'POST',
        headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await sub.json();
      if (!sub.ok) throw new Error(muapiError(j, sub.status));
      const id = j.request_id || j.id;
      if (!id) throw new Error('Engine did not start the job');

      await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'video', model: MODEL, prompt, aspect: '9:16', credits: cost, status: 'processing' });
      return json(200, { request_id: id, credits: balance });
    } catch (e) {
      try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
      return json(502, { error: e.message || 'Could not start the edit', refunded: cost });
    }
  } catch (fatal) {
    return json(500, { error: 'Server error — please try again.' });
  }
};
