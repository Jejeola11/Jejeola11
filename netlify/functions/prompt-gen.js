// POST /.netlify/functions/prompt-gen
// Charged "Avatar Prompt Generator": turns a few choices into a strong,
// consistent-character prompt. Costs 1 credit (near-zero cost to us = profit).
const { admin, getUser, json } = require('./_supabase');

const PROMPT_COST = 1;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const subject = (body.subject || '').trim();
  const extra = (body.extra || '').trim();
  const f = body.fields || {};
  const hasFields = Object.keys(f).length > 0;
  if (!subject && !hasFields) return json(400, { error: 'Pick a few options or type a subject.' });

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: PROMPT_COST });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  // Assemble a strong, consistent-character prompt from the chosen fragments.
  let frame = 'editorial portrait', cam = '';
  if (f.shot) { const sp = String(f.shot).split('|'); frame = sp[0]; cam = sp[1] || ''; }
  const who = subject || [f.vibe, f.heritage, f.gender].filter(Boolean).join(' ') || 'the same consistent character';
  const parts = [`${frame} of ${who}`];
  if (f.hair) parts.push(f.hair);
  if (f.outfit) parts.push('wearing ' + f.outfit);
  if (f.setting) parts.push(f.setting);
  if (f.lighting) parts.push(f.lighting + ' lighting');
  if (extra) parts.push(extra);
  if (cam) parts.push(cam);
  parts.push('photorealistic, identical consistent face, ultra-detailed skin texture, premium color grade, sharp focus, magazine quality');
  const prompt = parts.join(', ');

  return json(200, { prompt, credits: balance });
};
