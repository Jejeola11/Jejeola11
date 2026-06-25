// ============================================================
// POST /.netlify/functions/avatar-generate   (AI Avatar Studio)
// Auth required. Body: { avatar_id, prompt, aspect }
// Generates the user in a new scene while keeping their trained face,
// using MuAPI Nano Banana EDIT with the avatar's reference photos + optional extras.
// IMPORTANT: nano-banana = text-to-image (ignores refs). nano-banana-edit = uses images_list.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { muapiHostImage } = require('./_muapi');

const AVATAR_COST = 10;
const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

async function muapiAvatar({ prompt, images_list, aspect }) {
  const key = process.env.MUAPI_KEY;
  const submit = await fetch(`${MUAPI_BASE}/nano-banana-edit`, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, aspect_ratio: aspect, images_list }),
  });
  const txt = await submit.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + submit.status));
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not return a job id');
  for (let i = 0; i < 85; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': key } })).json();
    if (p.status === 'completed') return { url: p.outputs && p.outputs[0], cost_usd: p.cost && p.cost.amount_usd };
    if (p.status === 'failed' || p.status === 'cancelled') throw new Error('Generation ' + p.status);
  }
  throw new Error('Timed out — please try again');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!process.env.MUAPI_KEY) return json(503, { error: 'Engine not connected (MUAPI_KEY missing).' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const prompt = (body.prompt || '').trim();
  const aspect = body.aspect || '9:16';
  if (!prompt) return json(400, { error: 'Describe the scene you want.' });

  // Optional extra reference images (e.g. a product bottle, a prop) — up to 3.
  const extraRefs = (Array.isArray(body.extra_refs) ? body.extra_refs : []).filter(Boolean).slice(0, 3);

  const db = admin();
  const { data: avatar } = await db.from('avatars').select('image_url, image_urls, user_id').eq('id', body.avatar_id).maybeSingle();
  if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });
  const imgs = (Array.isArray(avatar.image_urls) && avatar.image_urls.length) ? avatar.image_urls
    : (avatar.image_url ? [avatar.image_url] : []);
  if (!imgs.length) return json(400, { error: 'This avatar has no photos.' });

  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: AVATAR_COST });
  if (balance === null) return json(402, { error: 'Not enough credits.', need: AVATAR_COST, code: 'NO_CREDITS' });

  try {
    // Host avatar photos + extra references on MuAPI CDN, then merge them all into images_list.
    const allRefs = imgs.concat(extraRefs);
    const hosted = await Promise.all(allRefs.map(muapiHostImage));
    const r = await muapiAvatar({ prompt, images_list: hosted, aspect });
    if (!r.url) throw new Error('No image returned');
    await db.from('generations').insert({
      user_id: user.id, type: 'avatar', model: 'nano-banana', prompt, aspect,
      output_url: r.url, cost_usd: r.cost_usd, credits_spent: AVATAR_COST,
    });
    return json(200, { url: r.url, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: AVATAR_COST, why: 'refund' });
    return json(502, { error: e.message || 'Generation failed', refunded: AVATAR_COST });
  }
};
