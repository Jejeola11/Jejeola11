// ============================================================
// POST /.netlify/functions/avatar-generate   (AI Avatar Studio)
// Auth required. Body: { avatar_id, prompt, aspect }
// Generates the user IN a new scene while keeping their face consistent,
// using fal.ai Flux + PuLID identity. Comes online when FAL_KEY is set.
//   1. validate user + load their avatar (the reference selfie)
//   2. spend credits (refunded on failure)
//   3. call fal with the reference image + scene prompt
//   4. save + return the consistent-face image
// ============================================================
const { admin, getUser, json } = require('./_supabase');

const AVATAR_COST = 4; // identity generation costs more than a plain image
const FAL_MODEL = 'fal-ai/flux-pulid';

const SIZE = {
  '9:16': 'portrait_16_9',
  '1:1': 'square_hd',
  '4:5': 'portrait_4_3',
  '16:9': 'landscape_16_9',
};

async function falGenerate({ prompt, reference_image_url, image_size }) {
  const key = process.env.FAL_KEY;
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };

  // submit
  const sub = await fetch(`https://queue.fal.run/${FAL_MODEL}`, {
    method: 'POST', headers,
    body: JSON.stringify({ prompt, reference_image_url, image_size, num_inference_steps: 20, id_weight: 1 }),
  });
  const subData = await sub.json();
  if (!sub.ok) throw new Error((subData.detail && JSON.stringify(subData.detail)) || subData.error || ('Engine HTTP ' + sub.status));
  const statusUrl = subData.status_url;
  const responseUrl = subData.response_url;
  if (!statusUrl) throw new Error('No job started');

  // poll (~2.5 min max)
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const st = await fetch(statusUrl, { headers });
    const sd = await st.json();
    if (sd.status === 'COMPLETED') {
      const res = await fetch(responseUrl, { headers });
      const out = await res.json();
      const url = out.images && out.images[0] && out.images[0].url;
      return { url };
    }
    if (sd.status === 'FAILED' || sd.status === 'ERROR') throw new Error('Generation failed');
  }
  throw new Error('Timed out — please try again');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  if (!process.env.FAL_KEY) {
    return json(503, { error: 'Avatar Studio is being connected — consistent-face generation comes online once your FAL_KEY is added.', code: 'NOT_CONNECTED' });
  }

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const prompt = (body.prompt || '').trim();
  const aspect = body.aspect || '9:16';
  if (!prompt) return json(400, { error: 'Describe the scene you want.' });

  const db = admin();

  // Load the avatar (must belong to this user).
  const { data: avatar } = await db.from('avatars').select('image_url, user_id, name').eq('id', body.avatar_id).maybeSingle();
  if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });

  // Spend credits.
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: AVATAR_COST });
  if (balance === null) return json(402, { error: 'Not enough credits.', need: AVATAR_COST, code: 'NO_CREDITS' });

  try {
    const r = await falGenerate({ prompt, reference_image_url: avatar.image_url, image_size: SIZE[aspect] || 'portrait_16_9' });
    if (!r.url) throw new Error('No image returned');
    await db.from('generations').insert({
      user_id: user.id, type: 'avatar', model: FAL_MODEL, prompt, aspect,
      output_url: r.url, credits_spent: AVATAR_COST,
    });
    return json(200, { url: r.url, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: AVATAR_COST, why: 'refund' });
    return json(502, { error: e.message || 'Generation failed', refunded: AVATAR_COST });
  }
};
