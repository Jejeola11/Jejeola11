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

  const [{ data: contacts, error }, { data: sources }, { data: tags }] = await Promise.all([
    db.from('audience_contacts')
      .select('id, first_name, email_normalized, phone_raw, phone_e164, country, biggest_struggle, email_marketing_status, whatsapp_marketing_status, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
    db.from('audience_contact_sources').select('contact_id, source'),
    db.from('audience_tags').select('contact_id, tag')
  ]);

  if (error) return json(500, { error: 'We could not load the audience right now.' });

  const sourcesByContact = new Map();
  for (const item of sources || []) {
    const list = sourcesByContact.get(item.contact_id) || [];
    list.push(item.source);
    sourcesByContact.set(item.contact_id, list);
  }
  const tagsByContact = new Map();
  for (const item of tags || []) {
    const list = tagsByContact.get(item.contact_id) || [];
    list.push(item.tag);
    tagsByContact.set(item.contact_id, list);
  }
  const rows = (contacts || []).map(contact => ({
    ...contact,
    email: contact.email_normalized,
    whatsapp: contact.phone_e164 || contact.phone_raw,
    source: (sourcesByContact.get(contact.id) || ['unknown'])[0],
    sources: sourcesByContact.get(contact.id) || [],
    tags: tagsByContact.get(contact.id) || []
  }));
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
    whatsappOptedIn: rows.filter(row => row.whatsapp_marketing_status === 'opted_in').length,
    emailSubscribed: rows.filter(row => row.email_marketing_status === 'subscribed').length
  });
};
