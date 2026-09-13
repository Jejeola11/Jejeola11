// ============================================================
// /.netlify/functions/avatar-stills   (Avatar Creator — the reusable photo
// library behind an avatar, not just its one trained_frame_url)
//
// GET  ?avatar_id=X          -> list this avatar's saved stills
// POST { action:'save', avatar_id, image_url, source?, label? } -> save one
// POST { action:'delete', id } -> remove one
//
// Synchronous — pure database reads/writes, no generation, no credit charge.
// Ownership is always re-checked server-side (never trust the browser's
// avatar_id/id alone) since RLS on this table is select-only; all writes
// go through the service-role client.
// ============================================================
const { admin, getUser, json } = require('./_supabase');

exports.handler = async (event) => {
  try {
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });
    const db = admin();

    if (event.httpMethod === 'GET') {
      const avatarId = (event.queryStringParameters || {}).avatar_id;
      if (!avatarId) return json(400, { error: 'Missing avatar_id' });
      const { data: avatar } = await db.from('avatars').select('id').eq('id', avatarId).eq('user_id', user.id).maybeSingle();
      if (!avatar) return json(404, { error: 'Avatar not found.' });
      const { data, error } = await db.from('avatar_stills').select('*').eq('avatar_id', avatarId).order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return json(200, { stills: data || [] });
    }

    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

    if (body.action === 'delete') {
      const id = body.id;
      if (!id) return json(400, { error: 'Missing id' });
      const { error } = await db.from('avatar_stills').delete().eq('id', id).eq('user_id', user.id);
      if (error) throw new Error(error.message);
      return json(200, { ok: true });
    }

    // default / action:'save'
    const avatarId = body.avatar_id;
    const imageUrl = (body.image_url || '').trim();
    const source = body.source === 'generated' ? 'generated' : 'uploaded';
    const label = (body.label || '').trim() || null;
    if (!avatarId) return json(400, { error: 'Missing avatar_id' });
    if (!imageUrl) return json(400, { error: 'Missing image_url' });

    const { data: avatar } = await db.from('avatars').select('id').eq('id', avatarId).eq('user_id', user.id).maybeSingle();
    if (!avatar) return json(404, { error: 'Avatar not found.' });

    const { data, error } = await db.from('avatar_stills').insert({
      avatar_id: avatarId, user_id: user.id, image_url: imageUrl, source, label,
    }).select().single();
    if (error) throw new Error(error.message);
    return json(200, { still: data });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not save this photo.' });
  }
};
