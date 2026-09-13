const { admin, getUser, json } = require('./_supabase');
const clean = (value, max = 2400) => String(value || '').trim().slice(0, max);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (_) { return json(400, { error: 'Invalid request.' }); }
  const prospectId = clean(body.prospect_id, 80), reply = clean(body.reply, 5000), notes = clean(body.notes, 3000);
  if (!prospectId || !reply) return json(400, { error: 'Paste the client reply first.' });
  const db = admin();
  const { data: prospect } = await db.from('client_prospects').select('*').eq('id', prospectId).eq('user_id', user.id).maybeSingle();
  if (!prospect) return json(404, { error: 'Prospect not found.' });
  const brief = {
    brand: prospect.brand_name, website: prospect.website, service: prospect.service, niche: prospect.niche,
    objective: `Create a focused sample that proves the ${prospect.service || 'proposed'} opportunity for ${prospect.brand_name}.`,
    evidence: prospect.evidence || [], visible_gap: prospect.visible_problem || '', client_reply: reply,
    deliverables: ['One sample concept', 'One concise explanation of the conversion angle', 'Offer copy for handoff'],
    constraints: notes || 'Keep the sample focused on the observed gap. Do not promise unverified results.'
  };
  const proposal = `Thanks for getting back to me. Based on your current push, I would create a focused ${prospect.service || 'creative'} sample for ${prospect.brand_name} that addresses the opportunity I spotted. I will keep it specific to your brand and include the exact hand-off copy so it is easy to use. Would you like me to send the sample direction first?`;
  const { data, error } = await db.from('client_prospects').update({ reply_text: reply, replied_at: new Date().toISOString(), notes: notes || prospect.notes, sample_brief: brief, proposal_copy: proposal, status: 'brief_ready' }).eq('id', prospectId).eq('user_id', user.id).select().single();
  if (error) return json(500, { error: 'Could not create the sample brief.' });
  return json(200, { prospect: data, brief, proposal_copy: proposal });
};
