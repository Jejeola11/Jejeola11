const { createClient } = require('@supabase/supabase-js');

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  const token = String((event.headers && (event.headers.authorization || event.headers.Authorization)) || '').replace(/^Bearer\s+/i, '').trim();
  const url = (process.env.SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!token) return json(401, { error: 'Please sign in to view this dashboard.' });
  if (!url || !key) return json(503, { error: 'Dashboard is briefly unavailable.' });

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await supabase.auth.getUser(token);
  if (authError || !auth.user || auth.user.app_metadata?.phone_to_client_admin !== true) return json(403, { error: 'You do not have access to this dashboard.' });

  const { data: leads, error } = await supabase
    .from('phone_to_client_leads')
    .select('id,first_name,email,whatsapp,country,biggest_struggle,source,utm_campaign,created_at')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) return json(500, { error: 'Could not load registrations.' });

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = leads.filter(lead => String(lead.created_at).slice(0, 10) === today).length;
  const countries = [...new Set(leads.map(lead => lead.country).filter(Boolean))].length;
  return json(200, { leads, stats: { total: leads.length, today: todayCount, countries } });
};
