const { admin, getUser, json } = require('./_supabase');
const { archiveVideo, isArchived } = require('./_video-archive');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed.' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Sign in to access your video.' });
  let id;
  try { id = JSON.parse(event.body || '{}').id; } catch (_) { return json(400, { error: 'Invalid request.' }); }
  if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/i.test(id)) return json(400, { error: 'Invalid video ID.' });
  const db = admin();
  const { data, error } = await db.from('generations').select('id,type,model,output_url').eq('id', id).eq('user_id', user.id).maybeSingle();
  if (error) return json(500, { error: 'Could not open the video.' });
  if (!data || !(data.type === 'video' || String(data.model).includes('video'))) return json(404, { error: 'Video not found.' });
  const archived = await archiveVideo(db, user.id, data.output_url, data.id);
  if (!isArchived(archived)) return json(502, { error: 'The original video is unavailable. Please contact support with this video’s date so we can check the provider copy.' });
  if (archived !== data.output_url) {
    const { error: updateError } = await db.from('generations').update({ output_url: archived }).eq('id', id).eq('user_id', user.id);
    if (updateError) return json(500, { error: 'The video was recovered but could not be saved. Please retry.' });
  }
  const url = new URL(archived);
  url.searchParams.set('download', `fuse-atelier-video-${id.slice(0,8)}.mp4`);
  return json(200, { url: archived, download_url: url.href });
};
