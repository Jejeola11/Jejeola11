// ============================================================
// POST /.netlify/functions/flyer-spec-render   (Flyer Studio)
// Body: { project_id, scale?, spec? }
//
// Composites a design spec into a finished PNG and stores it as the
// project's final_url. Free and synchronous: nothing is generated here, it
// only draws layers that already exist (flat fills, cached layer images,
// real text), so it is fast and costs no credits — the user can re-export
// after nudging type without paying for it again.
//
// `spec` lets the editor render exactly what is on the user's canvas
// (positions they dragged, colours they changed) without having to save
// first; when omitted the stored spec is used.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { validateSpec } = require('./_flyer-spec');
const { renderSpec } = require('./_flyer-render');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  if (!projectId) return json(400, { error: 'Missing project_id' });

  const db = admin();
  const { data: project } = await db.from('flyer_projects')
    .select('id,user_id,design_spec,layer_images').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found' });

  const source = body.spec && typeof body.spec === 'object' ? body.spec : project.design_spec;
  if (!source) return json(400, { error: 'This project has no design spec yet.' });

  const { spec, problems } = validateSpec(source);
  if (!spec.layers.length) return json(422, { error: 'This design has no layers.', problems });

  try {
    // Export at full spec size by default. A scale below 1 is the editor
    // asking for a cheap preview, not a deliverable.
    const scale = Math.min(1, Math.max(0.1, Number(body.scale) || 1));
    const canvas = await renderSpec(spec, project.layer_images || {}, { scale });
    const buffer = canvas.toBuffer('image/png');

    const path = `${user.id}/flyer-${projectId}-${Date.now()}.png`;
    const { error: upErr } = await db.storage.from('generations').upload(path, buffer, { contentType: 'image/png', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { data: pub } = db.storage.from('generations').getPublicUrl(path);
    const url = pub && pub.publicUrl;

    // Only a full-size render is the finished artwork — a preview scale
    // must not overwrite the project's deliverable.
    if (scale === 1) {
      await db.from('flyer_projects').update({ final_url: url, updated_at: new Date().toISOString() }).eq('id', projectId);
    }
    return json(200, { ok: true, url, width: canvas.width, height: canvas.height, problems });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not render the design.' });
  }
};
