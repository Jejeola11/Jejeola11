const { admin, json } = require('./_supabase');

function parseBody(event) {
  try { return typeof event.body === 'string' ? JSON.parse(event.body || '{}') : (event.body || {}); }
  catch { return null; }
}
function clean(value, max = 160) {
  return String(value || '').trim().slice(0, max);
}
function normalizePhone(value) {
  const phone = clean(value, 24).replace(/[\s().-]/g, '');
  return /^\+[1-9]\d{7,14}$/.test(phone) ? phone : null;
}
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const body = parseBody(event);
  if (!body) return json(400, { error: 'Invalid request.' });
  if (clean(body.website, 200)) return json(200, { ok: true }); // Honeypot

  const first_name = clean(body.first_name, 80);
  const email = clean(body.email, 160);
  const email_normalized = email.toLowerCase();
  const country = clean(body.country, 100);
  const phone_e164 = normalizePhone(body.phone_e164);
  const browser_token = clean(body.browser_token, 120);
  const source = clean(body.source, 500);
  const utm_campaign = clean(body.utm_campaign, 160);

  if (!first_name || !country || !phone_e164 || !browser_token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_normalized)) {
    return json(400, { error: 'Please enter your name, a valid email, country and WhatsApp number.' });
  }

  const db = admin();
  const { data: existing, error: lookupError } = await db
    .from('phone_to_client_leads')
    .select('id, browser_token')
    .eq('email_normalized', email_normalized)
    .eq('lead_type', 'playbook')
    .maybeSingle();
  if (lookupError) return json(500, { error: 'We could not save your details right now. Please try again.' });

  const lead = {
    first_name, email, email_normalized, whatsapp: phone_e164, phone_e164, country,
    lead_type: 'playbook', browser_token, source, utm_campaign, updated_at: new Date().toISOString()
  };
  const write = existing
    ? db.from('phone_to_client_leads').update(lead).eq('id', existing.id)
    : db.from('phone_to_client_leads').insert(lead);
  const { error: writeError } = await write;
  if (writeError) return json(500, { error: 'We could not save your details right now. Please try again.' });

  return json(200, { ok: true, browser_token });
};