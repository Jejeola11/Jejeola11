// ============================================================
// POST /.netlify/functions/video-generate   (Video Studio — async submit)
// Video renders take minutes, far longer than a function can run. So we just
// SUBMIT here (fast), store a job, and return the request_id. The browser then
// polls /job-status until it's done.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { VIDEO_MODELS } = require('./_packs');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const prompt = (body.prompt || '').trim();
  const aspect = body.aspect || '16:9';
  const duration = body.duration || '5s';
  const resolution = body.resolution || '480p';
  const image_url = (body.image_url || '').trim() || undefined;
  // Attaching a start image switches to the image-to-video variant.
  const model = image_url ? (body.model || '').replace('text-to-video', 'image-to-video') : body.model;

  if (!VIDEO_MODELS[model]) return json(400, { error: 'Unknown video model.' });
  if (!prompt && !image_url) return json(400, { error: 'Add a prompt or a starting image.' });

  const durMult = String(duration).startsWith('10') ? 2 : 1;
  const cost = VIDEO_MODELS[model] * durMult;

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    const payload = { prompt, aspect_ratio: aspect, duration, resolution };
    if (image_url) payload.images_list = [image_url];
    const sub = await fetch(`${MUAPI_BASE}/${model}`, {
      method: 'POST',
      headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const j = await sub.json();
    if (!sub.ok) throw new Error((j && (j.detail || (j.error && j.error.message) || j.error)) || ('Engine HTTP ' + sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'video', model, prompt, aspect, credits: cost, status: 'processing' });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: typeof e.message === 'string' ? e.message : 'Could not start video', refunded: cost });
  }
};
