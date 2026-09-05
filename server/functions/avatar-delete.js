// ============================================================
// POST /.netlify/functions/avatar-delete
// Body: { avatar_id }
// Deletes a whole trained avatar (not a single training photo — see
// avatar-train.js's remove_photo_url for that). avatar_videos.avatar_id
// is declared "on delete cascade" (schema-phase14.sql), so any avatar
// videos made from this avatar go with it automatically.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const id = body.avatar_id;
    if (!id) return json(400, { error: 'Missing avatar_id' });

    const db = admin();
    const { data: row } = await db.from('avatars').select('id, user_id').eq('id', id).maybeSingle();
    if (!row || row.user_id !== user.id) return json(404, { error: 'Avatar not found.' });

    const { error } = await db.from('avatars').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return json(200, { ok: true });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not delete this avatar.' });
  }
};
