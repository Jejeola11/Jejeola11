const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed.' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  const db = admin();
  const { data: me, error: meError } = await db
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .maybeSingle();
  if (meError || !me || !me.is_admin) return json(403, { error: 'Admins only.' });

  const { data, error } = await db
    .from('phone_to_client_leads')
    .select('id, first_name, email, country, whatsapp, phone_e164, lead_type, source, utm_campaign, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) return json(500, { error: 'We could not load the audience right now.' });

  const rows = data || [];
  const clean = value => String(value || '').trim();
  const by = key => rows.reduce((result, row) => {
    const label = clean(row[key]) || 'Unknown';
    result[label] = (result[label] || 0) + 1;
    return result;
  }, {});
  const sortCounts = counts => Object.entries(counts).sort((a, b) => b[1] - a[1]);

  return json(200, {
    ok: true,
    total: rows.length,
    leads: rows,
    countries: sortCounts(by('country')),
    sources: sortCounts(by('source')),
    types: sortCounts(by('lead_type'))
  });
};
