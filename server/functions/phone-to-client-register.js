const { createClient } = require('@supabase/supabase-js');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

const clean = (value, max) => String(value || '').trim().slice(0, max);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); }
  catch (_) { return json(400, { error: 'Please check the form and try again.' }); }

  if (body.website) return json(200, { ok: true });

  const lead = {
    first_name: clean(body.first_name, 80),
    email: clean(body.email, 160).toLowerCase(),
    whatsapp: clean(body.whatsapp, 40),
    country: clean(body.country, 80),
    biggest_struggle: clean(body.biggest_struggle, 160),
    source: clean(body.source, 300) || 'direct',
    utm_campaign: clean(body.utm_campaign, 160)
  };

  if (!lead.first_name || !lead.email || !lead.whatsapp || !lead.country || !lead.biggest_struggle) {
    return json(400, { error: 'Please complete every field.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(lead.email)) return json(400, { error: 'Please enter a valid email address.' });
  if (!/^[+()\d\s-]{7,40}$/.test(lead.whatsapp)) return json(400, { error: 'Please enter a valid WhatsApp number, including your country code.' });

  // Some shared Fuse deployments store the Data API URL instead of the
  // project base URL. supabase-js appends /rest/v1 itself, so normalize it.
  const url = (process.env.SUPABASE_URL || '').trim().replace(/\/rest\/v1\/?$/i, '').replace(/\/$/, '');
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || !key) return json(503, { error: 'Registration is briefly unavailable. Please try again.' });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await supabase.from('phone_to_client_leads').upsert(lead, { onConflict: 'email' });
  if (error) {
    console.error('phone-to-client registration failed', error.code, error.message);
    return json(500, { error: 'We could not save your registration. Please try again.' });
  }
  return json(200, { ok: true });
};
