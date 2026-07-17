// ============================================================
// POST /.netlify/functions/avatar-train   (AI Avatar Creator — face/voice training)
// Body: { avatar_id, source_video_url?, voice_sample_url?, voice_reference_text? }
// `avatars` has no client-facing UPDATE policy (by design — every write goes
// through a service-role function, see schema-phase4.sql), so this is how
// the front end attaches a training video / voice sample after uploading
// the raw file straight to Storage. A training video also needs a still
// frame pulled out server-side (the browser can't run ffmpeg) to become the
// master identity photo long-form video chunk 1 starts from.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, extractFrameAt, uploadToStorage } = require('./_ffmpeg');
const path = require('path');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const avatarId = body.avatar_id;
    const sourceVideoUrl = (body.source_video_url || '').trim();
    const voiceSampleUrl = (body.voice_sample_url || '').trim();
    const voiceReferenceText = (body.voice_reference_text || '').trim();
    if (!avatarId) return json(400, { error: 'Missing avatar_id' });
    if (!sourceVideoUrl && !voiceSampleUrl) return json(400, { error: 'Nothing to train.' });

    const db = admin();
    const { data: avatar } = await db.from('avatars').select('id, user_id').eq('id', avatarId).maybeSingle();
    if (!avatar || avatar.user_id !== user.id) return json(404, { error: 'Avatar not found.' });

    const update = {};
    if (voiceSampleUrl) { update.voice_sample_url = voiceSampleUrl; update.voice_status = 'ready'; update.voice_reference_text = voiceReferenceText || null; }

    if (sourceVideoUrl) {
      const jobId = 'train-' + avatarId + '-' + Date.now();
      try {
        const dir = await ensureWorkDir(jobId);
        const localVideo = path.join(dir, 'source.mp4');
        await downloadToFile(sourceVideoUrl, localVideo);
        const framePath = path.join(dir, 'master-frame.png');
        // 1s in — past any initial hand-off/blink, before the camera person moves.
        await extractFrameAt(localVideo, 1, framePath);
        const frameUrl = await uploadToStorage(db, framePath, `${user.id}/av-trained-${avatarId}-${Date.now()}.png`, 'image/png');
        update.source_video_url = sourceVideoUrl;
        update.trained_frame_url = frameUrl;
      } finally {
        await cleanupTmp(jobId);
      }
    }

    const { error } = await db.from('avatars').update(update).eq('id', avatarId);
    if (error) throw new Error(error.message);
    return json(200, { ok: true, ...update });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not save training data.' });
  }
};
