// ============================================================
// POST /.netlify/functions/video-caption-apply   (Video Editing Studio)
// Body: { project_id, accent_color?, position? }
// Burns bold, word-timed captions onto the project's source video using
// the transcript from video-transcribe.js, via ffmpeg's libass renderer
// (_captions.js builds the .ass file). Synchronous — a single ffmpeg pass,
// not a new AI generation — no credit charge beyond the transcription
// already paid for; recomposite as many times as you like while dialing
// in the style/color.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, probeDimensions, burnAssSubtitles, uploadToStorage } = require('./_ffmpeg');
const { writeAssFile } = require('./_captions');
const path = require('path');

exports.handler = async (event) => {
  const jobId = 'caption-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    if (!projectId) return json(400, { error: 'Missing project_id' });

    const db = admin();
    const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    if (!project.transcript) return json(400, { error: 'Transcribe the video first.' });

    const style = { accent_color: body.accent_color || '#00e0c6', position: body.position === 'top' ? 'top' : 'bottom' };
    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    await downloadToFile(project.source_video_url, localVideo);
    const { width, height } = await probeDimensions(localVideo);

    const assPath = path.join(dir, 'cap.ass');
    await writeAssFile(assPath, { transcript: project.transcript, width, height, accentColor: style.accent_color, position: style.position });

    const outPath = path.join(dir, 'out.mp4');
    await burnAssSubtitles(localVideo, assPath, outPath);
    const finalUrl = await uploadToStorage(db, outPath, `${user.id}/caption-${projectId}-${Date.now()}.mp4`, 'video/mp4');

    // final_video_url is the single "current working video" pointer every
    // subsequent step (elements, CTA) reads from and writes back to — same
    // pattern as Flyer Studio's hero_image_url.
    await db.from('video_edit_projects').update({ captioned_video_url: finalUrl, final_video_url: finalUrl, caption_style: style, updated_at: new Date().toISOString() }).eq('id', projectId);
    await cleanupTmp(jobId);
    return json(200, { url: finalUrl });
  } catch (e) {
    try { await cleanupTmp(jobId); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not apply captions.' });
  }
};
