// ============================================================
// POST /.netlify/functions/tool-generate   (utility tools — async submit)
// Auth required. Body: { slug, image_url, prompt? }
// Runs utility tools (upscale, background remove, object erase) — WaveSpeed
// first (cheaper, verified live 2026-07-16 against its own model catalog:
// wavespeed-ai/image-upscaler, image-background-remover, image-eraser all
// real), MuAPI as the fallback if WAVESPEED_KEY isn't set. These can take
// longer than a function can run, so we SUBMIT and let the browser poll
// /job-status (same pattern as video + avatar). The input image is re-hosted
// first so either engine can fetch it.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { TOOL_MODELS } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitToolWS, hasWaveSpeed } = require('./_providers');

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
    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });
    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

    const slug = body.slug;
    const srcUrl = (body.image_url || '').trim();
    cost = TOOL_MODELS[slug];
    if (!cost) return json(400, { error: 'Unknown tool.' });
    if (!srcUrl) return json(400, { error: 'Upload an image first.' });

    db = admin();
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

    // Re-host the input so either engine can fetch it, then SUBMIT (no polling here).
    const image_url = await muapiHostImage(srcUrl);
    let id;
    if (hasWaveSpeed()) {
      try { const r = await submitToolWS(slug, { image: image_url, prompt: body.prompt }); if (r) id = r.requestId; } catch (e) {}
    }
    if (!id) {
      const payload = { image_url, images_list: [image_url] };
      if (body.prompt) payload.prompt = body.prompt;
      const sub = await fetch(`${MUAPI_BASE}/${slug}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await sub.json();
      if (!sub.ok) throw new Error(muapiError(j, sub.status));
      id = j.request_id || j.id;
    }
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'tool', model: slug, credits: cost, status: 'processing' });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Tool failed', refunded: cost });
  }
};
