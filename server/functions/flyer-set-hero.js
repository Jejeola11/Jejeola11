// ============================================================
// POST /.netlify/functions/flyer-set-hero   (Flyer Studio)
// Body: { project_id?, image_url, aspect? }
// Lets the user upload their OWN hero image directly and use it as the
// project's current working visual — skipping AI generation entirely.
// Add Layer and Composite only ever read project.hero_image_url, so this
// slots in exactly like a completed flyer-hero job would (creates the
// project if one doesn't exist yet), with no credits spent since nothing
// was actually generated.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const imageUrl = (body.image_url || '').trim();
  const aspect = body.aspect || '4:5';
  let projectId = body.project_id;
  if (!imageUrl) return json(400, { error: 'Missing image_url' });

  const db = admin();
  try {
    if (projectId) {
      const { data: project } = await db.from('flyer_projects').select('id, user_id').eq('id', projectId).maybeSingle();
      if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
      await db.from('flyer_projects').update({ hero_image_url: imageUrl, aspect, updated_at: new Date().toISOString() }).eq('id', projectId);
    } else {
      const { data: newProj } = await db.from('flyer_projects').insert({ user_id: user.id, brief: 'Uploaded hero image', hero_image_url: imageUrl, aspect }).select().single();
      projectId = newProj && newProj.id;
    }
    return json(200, { project_id: projectId, hero_image_url: imageUrl });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not set hero image' });
  }
};
