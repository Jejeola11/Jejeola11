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

  const { subject = '', setting = '', outfit = '', light = '', shot = '' } = body;
  if (!subject && !setting && !outfit) return json(400, { error: 'Pick a few options first.' });

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: PROMPT_COST });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  // Build a rich, consistent-character prompt.
  const parts = [];
  parts.push(shot || 'editorial portrait');
  parts.push('of ' + (subject || 'the same consistent character'));
  if (outfit) parts.push('wearing ' + outfit);
  if (setting) parts.push('in a ' + setting);
  if (light) parts.push(light);
  parts.push('identical facial features, consistent identity, ultra-detailed skin texture');
  parts.push('professional photography, sharp focus, premium color grade, 8k, magazine quality');
  const prompt = parts.join(', ');

  return json(200, { prompt, credits: balance });
};
