// ============================================================
// /.netlify/functions/leads-track   (auth required)
// GET   ?action=list              -> this user's leads, newest first
// POST  { action:'update', id, status?, notes?, last_contacted_at? }
// POST  { action:'delete', id }
// The simple tracker behind the Lead Finder tab: every lead found (or
// added manually) lives here with a status you move through the pipeline
// (new -> contacted -> replied -> sample_sent -> won/lost).
// ============================================================
const { admin, getUser, json } = require('./_pp');

const STATUSES = ['new', 'contacted', 'replied', 'sample_sent', 'won', 'lost'];

exports.handler = async (event) => {
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in.' });
  const db = admin();

  if (event.httpMethod === 'GET') {
    const { data, error } = await db
      .from('pp_leads')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true, leads: data });
  }

  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  if (body.action === 'delete') {
    if (!body.id) return json(400, { error: 'Missing lead id' });
    const { error } = await db.from('pp_leads').delete().eq('id', body.id).eq('user_id', user.id);
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true });
  }

  if (body.action === 'update') {
    if (!body.id) return json(400, { error: 'Missing lead id' });
    const patch = {};
    if (body.status) {
      if (!STATUSES.includes(body.status)) return json(400, { error: 'Bad status' });
      patch.status = body.status;
      if (body.status === 'contacted') patch.last_contacted_at = new Date().toISOString();
    }
    if (typeof body.notes === 'string') patch.notes = body.notes.slice(0, 2000);
    if (typeof body.sample_brief === 'string') patch.sample_brief = body.sample_brief.slice(0, 2000);
    if (!Object.keys(patch).length) return json(400, { error: 'Nothing to update' });
    const { data, error } = await db.from('pp_leads').update(patch).eq('id', body.id).eq('user_id', user.id).select('*').maybeSingle();
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true, lead: data });
  }

  if (body.action === 'add') {
    const { business_name, phone, email, website, address, category, notes } = body;
    if (!business_name) return json(400, { error: 'Business name is required.' });
    const { data, error } = await db
      .from('pp_leads')
      .insert({ user_id: user.id, business_name, phone, email, website, address, category, notes, source: 'manual', status: 'new' })
      .select('*')
      .maybeSingle();
    if (error) return json(500, { error: error.message });
    return json(200, { ok: true, lead: data });
  }

  return json(400, { error: 'Unknown action' });
};
