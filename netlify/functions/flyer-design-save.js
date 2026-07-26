// ============================================================
// POST /.netlify/functions/flyer-design-save   (Design Studio — "Save & use this")
// Body: { project_id, url }
//   url: the already-rendered PNG the browser just exported from the
//   Fabric.js canvas and uploaded to storage itself (Design Studio does the
//   actual rendering client-side, same as the reference-image upload flow
//   elsewhere in Flyer Studio — this endpoint only persists the result).
// No credits, no AI call — this is a hand-designed export, not a
// generation, so there's nothing to charge for.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  const url = (body.url || '').trim();
  if (!projectId) return json(400, { error: 'Missing project_id' });
  if (!url) return json(400, { error: 'Missing url' });

  const db = admin();
  const { data: project } = await db.from('flyer_projects').select('id,user_id,aspect').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found.' });

  try {
    await db.from('flyer_projects').update({ final_url: url, updated_at: new Date().toISOString() }).eq('id', projectId);
    try {
      await db.from('generations').insert({
        user_id: user.id, type: 'image', model: 'design-studio', prompt: 'Hand-designed in Design Studio',
        aspect: project.aspect, output_url: url, credits_spent: 0,
      });
    } catch (e) {}
    return json(200, { ok: true, url });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not save the design.' });
  }
};
