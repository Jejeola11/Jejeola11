// ============================================================
// POST /.netlify/functions/avatar-modelsheet   (async submit)
// Body: { avatar_id }. Generates a multi-angle CHARACTER MODEL SHEET from the
// avatar's uploaded photos using nano-banana-edit. The finished sheet is saved
// onto the avatar (job-status does it) and becomes the canonical reference for
// every future avatar generation — the Nano Banana consistency method.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { muapiHostImage } = require('./_muapi');

const SHEET_COST = 15;
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

const SHEET_PROMPT =
  'Create a professional character model sheet of this EXACT same person. A clean grid showing the identical face and identity from six angles: front view, three-quarter left, left profile, three-quarter right, right profile, and a slight downward look. Neutral calm expression, even soft studio lighting, plain light-grey seamless background, head and shoulders, consistent identical facial features and skin tone in every angle, photorealistic, ultra-detailed, sharp focus. Do not change the person.';

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Engine not connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const avatarId = body.avatar_id;
    if (!avatarId) return json(400, { error: 'Missing avatar_id' });

    db = admin();
    const { data: avatar } = await db.from('avatars').select('image_url, image_urls, user_id').eq('id', avatarId).maybeSingle();
    if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });
    const photos = (Array.isArray(avatar.image_urls) && avatar.image_urls.length) ? avatar.image_urls
      : (avatar.image_url ? [avatar.image_url] : []);
    if (!photos.length) return json(400, { error: 'This avatar has no photos.' });

    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: SHEET_COST });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: SHEET_COST, code: 'NO_CREDITS' });
    cost = SHEET_COST;

    // Use up to 6 of the best photos as identity references for the sheet.
    const refs = photos.slice(0, 6);
    const hosted = await Promise.all(refs.map(muapiHostImage));
    const sub = await fetch(`${MUAPI_BASE}/nano-banana-edit`, {
      method: 'POST',
      headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: SHEET_PROMPT, aspect_ratio: '1:1', images_list: hosted }),
    });
    const j = await sub.json();
    if (!sub.ok) throw new Error(muapiError(j, sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not start the job');

    // Carry the avatar id inside `prompt` so job-status can save the sheet onto the
    // avatar without depending on an extra jobs column.
    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'modelsheet', model: 'nano-banana-edit', prompt: 'MODELSHEET::' + avatarId, aspect: '1:1', credits: SHEET_COST, status: 'processing' });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start model sheet', refunded: cost });
  }
};
