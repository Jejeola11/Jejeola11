// ============================================================
// POST /.netlify/functions/flyer-design-save   (Design Studio — "Save")
// Body: { project_id, url, design_state?, design_state_hero_url? }
//   url: the already-rendered PNG the browser just exported from the
//   Fabric.js canvas and uploaded to storage itself (Design Studio does the
//   actual rendering client-side, same as the reference-image upload flow
//   elsewhere in Flyer Studio — this endpoint only persists the result).
//   design_state: canvas.toJSON() — every object, position, and style,
//   not just the flattened pixels. Without this, reopening the editor had
//   nothing to reopen INTO — it could only re-show the flat PNG as a new
//   background, so every layer someone placed was gone (baked into
//   pixels, no longer movable/editable). Saving this alongside the PNG is
//   what makes "go back anytime and keep editing" actually possible.
//   design_state_hero_url: which hero image that saved state was built on
//   top of — lets the client tell "hero hasn't changed, reopen the saved
//   layers" apart from "a NEW hero was generated since this save, start
//   fresh from that instead" without a separate version table.
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
  const designState = (body.design_state && typeof body.design_state === 'object') ? body.design_state : null;
  const designStateHeroUrl = (body.design_state_hero_url || '').trim() || null;
  if (!projectId) return json(400, { error: 'Missing project_id' });
  if (!url) return json(400, { error: 'Missing url' });

  const db = admin();
  const { data: project } = await db.from('flyer_projects').select('id,user_id,aspect').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found.' });

  try {
    const update = { final_url: url, updated_at: new Date().toISOString() };
    if (designState) { update.design_state = designState; update.design_state_hero_url = designStateHeroUrl; }
    await db.from('flyer_projects').update(update).eq('id', projectId);
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
