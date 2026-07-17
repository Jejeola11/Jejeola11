// ============================================================
// POST /.netlify/functions/delete-generation
// Body: { id }
// Deletes a single row from `generations` (the Projects/Library grid) —
// there's no client-facing DELETE policy on that table (only read), so
// this is the service-role-mediated path for it, same pattern as every
// other write in this app that needs to check ownership first.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const id = body.id;
    if (!id) return json(400, { error: 'Missing id' });

    const db = admin();
    const { data: row } = await db.from('generations').select('id, user_id').eq('id', id).maybeSingle();
    if (!row || row.user_id !== user.id) return json(404, { error: 'Not found.' });

    const { error } = await db.from('generations').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return json(200, { ok: true });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not delete this project.' });
  }
};
