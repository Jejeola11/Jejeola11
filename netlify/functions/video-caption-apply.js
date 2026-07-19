// ============================================================
// POST /.netlify/functions/video-caption-apply   (Video Editing Studio)
// Body: { project_id, effect?, color?, color2?, position? }
//   effect: 'solid' | 'gradient' | 'highlight-box' | 'glow'
//   color / color2: hex — color2 is the gradient's second stop
// Burns bold, word-timed captions onto the project's source video using
// the transcript from video-transcribe.js. Each caption phrase is rendered
// as its own PNG via _captions.js (full color/gradient/effect control),
// composited in one ffmpeg pass via _ffmpeg.js's overlayTimedImages.
// Synchronous — not a new AI generation — no credit charge beyond the
// transcription already paid for; recomposite as many times as you like
// while dialing in the style.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, overlayTimedImages, uploadToStorage } = require('./_ffmpeg');
const { probeDimensions } = require('./_ffprobe');
const { chunkWords, extractWords, renderCaptionCard } = require('./_captions');
const path = require('path');
const fs = require('fs/promises');

const EFFECTS = ['solid', 'gradient', 'highlight-box', 'glow'];

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

    const style = {
      effect: EFFECTS.includes(body.effect) ? body.effect : 'solid',
      color: body.color || '#ffffff',
      color2: body.color2 || '#00e0c6',
      position: body.position === 'top' ? 'top' : 'bottom',
    };

    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    await downloadToFile(project.source_video_url, localVideo);
    const { width, height } = await probeDimensions(localVideo);

    const words = extractWords(project.transcript);
    const chunks = words.length ? chunkWords(words) : (project.transcript.text ? [{ start: 0, end: 999999, text: project.transcript.text }] : []);
    if (!chunks.length) return json(400, { error: 'No transcript text to caption.' });

    const overlays = [];
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      const buf = renderCaptionCard({
        text: c.text, width, height,
        style: { effect: style.effect, color: style.color, gradientColors: [style.color, style.color2], position: style.position },
      });
      const p = path.join(dir, `card-${i}.png`);
      await fs.writeFile(p, buf);
      overlays.push({ pngPath: p, start: c.start, end: Math.min(c.end, 999998) });
    }

    const outPath = path.join(dir, 'out.mp4');
    await overlayTimedImages(localVideo, overlays, outPath);
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
