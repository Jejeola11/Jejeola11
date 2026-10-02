const { admin, json } = require('./_supabase');

const ALLOWED_ORIGINS = new Set([
  'https://fuse-atelier.vercel.app',
  'https://fuseatelier.com',
  'https://www.fuseatelier.com',
  'https://fuse-atelier-guide.vercel.app',
  'https://ai-image-codes.vercel.app',
  'https://prompt-image-drop.vercel.app',
  'https://ai-creative-stack.vercel.app',
]);
function cors(event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  return ALLOWED_ORIGINS.has(origin)
    ? {
        'Access-Control-Allow-Origin': origin,
        'Vary': 'Origin',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    : {};
}
function response(event, statusCode, body) {
  const result = json(statusCode, body);
  result.headers = { ...result.headers, ...cors(event) };
  return result;
}
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
  if (event.httpMethod === 'OPTIONS') return response(event, 204, {});
  if (event.httpMethod !== 'POST') return response(event, 405, { error: 'Method not allowed.' });
  const body = parseBody(event);
  if (!body) return response(event, 400, { error: 'Invalid request.' });
  if (clean(body.website, 200)) return response(event, 200, { ok: true }); // Honeypot

  const first_name = clean(body.first_name, 80);
  const email = clean(body.email, 160);
  const email_normalized = email.toLowerCase();
  const country = clean(body.country, 100);
  const phone_e164 = normalizePhone(body.phone_e164);
  const browser_token = clean(body.browser_token, 120);
  const requested_lead_type = clean(body.lead_type, 40);
  const lead_type = 'playbook';
  const source = clean(body.source, 500);
  const utm_campaign = clean(body.utm_campaign, 160);
  const whatsapp_opt_in = body.whatsapp_opt_in === true || body.whatsapp_opt_in === 'true' || body.whatsapp_opt_in === 'on';
  const biggest_struggle = clean(
    body.biggest_struggle || (requested_lead_type === 'code-vault'
      ? 'Accessing Director Ria code vault resources'
      : 'Accessing the First Client Playbook'),
    160
  );

  if (!first_name || !country || !phone_e164 || !browser_token || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email_normalized)) {
    return response(event, 400, { error: 'Please enter your name, a valid email, country and WhatsApp number.' });
  }

  const db = admin();
  const { data: existing, error: lookupError } = await db
    .from('phone_to_client_leads')
    .select('id, browser_token')
    .eq('email_normalized', email_normalized)
    .maybeSingle();
  if (lookupError) {
    console.error('[playbook-lead] lead lookup failed', { code: lookupError.code, message: lookupError.message });
    return response(event, 500, { error: 'We could not save your details right now. Please try again.' });
  }

  const lead = {
    first_name, email, email_normalized, whatsapp: phone_e164, phone_e164, country,
    biggest_struggle, lead_type, browser_token, source, utm_campaign, updated_at: new Date().toISOString()
  };
  const write = existing
    ? db.from('phone_to_client_leads').update(lead).eq('id', existing.id)
    : db.from('phone_to_client_leads').insert(lead);
  const { error: writeError } = await write;
  if (writeError) {
    console.error('[playbook-lead] lead write failed', { code: writeError.code, message: writeError.message });
    return response(event, 500, { error: 'We could not save your details right now. Please try again.' });
  }

  // Keep the private Fuse Audience dashboard in sync with every public lead form.
  const audiencePayload = {
    first_name,
    email_normalized,
    phone_e164,
    phone_raw: phone_e164,
    country,
    biggest_struggle,
    updated_at: new Date().toISOString(),
  };
  if (whatsapp_opt_in) {
    audiencePayload.whatsapp_marketing_status = 'opted_in';
    audiencePayload.whatsapp_opted_in_at = new Date().toISOString();
    audiencePayload.whatsapp_opted_out_at = null;
  }
  let { data: audienceContact, error: audienceLookupError } = await db
    .from('audience_contacts')
    .select('id')
    .eq('email_normalized', email_normalized)
    .maybeSingle();
  if (audienceLookupError) return response(event, 500, { error: 'We could not sync your details to the audience dashboard.' });
  if (!audienceContact && phone_e164) {
    const phoneLookup = await db.from('audience_contacts').select('id').eq('phone_e164', phone_e164).maybeSingle();
    if (phoneLookup.error) return response(event, 500, { error: 'We could not sync your details to the audience dashboard.' });
    audienceContact = phoneLookup.data;
  }
  if (audienceContact) {
    const { error } = await db.from('audience_contacts').update(audiencePayload).eq('id', audienceContact.id);
    if (error) return response(event, 500, { error: 'We could not sync your details to the audience dashboard.' });
  } else {
    const inserted = await db.from('audience_contacts').insert(audiencePayload).select('id').single();
    if (inserted.error) return response(event, 500, { error: 'We could not sync your details to the audience dashboard.' });
    audienceContact = inserted.data;
  }
  const audienceSource = source || 'direct';
  const sourceLookup = await db.from('audience_contact_sources').select('id').eq('contact_id', audienceContact.id).eq('source', audienceSource).maybeSingle();
  if (sourceLookup.error) return response(event, 500, { error: 'We could not sync your source to the audience dashboard.' });
  if (!sourceLookup.data) {
    const { error } = await db.from('audience_contact_sources').insert({ contact_id: audienceContact.id, source: audienceSource });
    if (error) return response(event, 500, { error: 'We could not sync your source to the audience dashboard.' });
  }

  return response(event, 200, { ok: true, browser_token });
};