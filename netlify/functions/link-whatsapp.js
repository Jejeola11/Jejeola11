// POST /.netlify/functions/link-whatsapp — save the user's WhatsApp number.
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  // keep digits only (WhatsApp uses full international number, no +)
  const phone = (body.phone || '').replace(/[^0-9]/g, '');
  if (phone.length < 10) return json(400, { error: 'Enter a valid number with country code, e.g. 2348012345678.' });
  const { error } = await admin().from('profiles').update({ wa_phone: phone }).eq('id', user.id);
  if (error) return json(500, { error: 'Could not link number.' });
  return json(200, { ok: true, phone });
};
