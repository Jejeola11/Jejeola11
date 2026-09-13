// ============================================================
// POST /.netlify/functions/flyer-project-create   (Design Studio — launch from Home)
// Body: { aspect? }
// Every other Design Studio entry point piggybacks on a flyer_projects row
// that already exists (created as a side effect of generating a hero
// visual in flyer-hero.js). Launching Design Studio directly from Home —
// "just to design," no AI step first — has no such row yet, and there's
// no RLS insert policy letting the client create one itself (flyer_projects
// only has a SELECT policy; every write goes through a server function
// with the admin client, same as flyer-hero.js/flyer-composite-fonts.js).
// This is that same creation, just without requiring a hero_prompt.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { body = {}; }
  const aspect = body.aspect || '4:5';

  const db = admin();
  try {
    const { data: project, error } = await db.from('flyer_projects')
      .insert({ user_id: user.id, brief: 'Blank Design Studio session', aspect })
      .select('id,aspect')
      .single();
    if (error) throw new Error(error.message);
    return json(200, { ok: true, project_id: project.id, aspect: project.aspect });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not start a new design.' });
  }
};
