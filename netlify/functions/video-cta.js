// ============================================================
// POST /.netlify/functions/video-cta   (burn in a CTA — ad/IG/TikTok ready)
// Body: { video_url?, project_id?, cta_text, position?, accent_color? }
// Takes ANY finished video (avatar video, general Studio video, or a Video
// Editing Studio project's current working video) and burns in a bold
// "comment a word" / "tap below" CTA banner so it's ready to post or run as
// an ad straight out of the studio — every piece of content should
// convert, not just look good. Pass either video_url directly, or
// project_id to operate on that project's current working video (and save
// the result back onto it as the final step of the editing chain).
// Synchronous: overlaying is a single fast re-encode pass (veryfast preset),
// not a new AI generation — no credit charge, composite as many times as
// you like while you dial in the wording.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, overlayImageOnVideo, uploadToStorage } = require('./_ffmpeg');
const { probeDimensions } = require('./_ffprobe');
const { createCanvas, drawCtaBanner } = require('./_canvas');
const path = require('path');

exports.handler = async (event) => {
  const jobId = 'cta-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const ctaText = (body.cta_text || '').trim();
    const position = body.position === 'top' ? 'top' : 'bottom';
    const accent = body.accent_color || '#00e0c6';
    if (!ctaText) return json(400, { error: 'Write the CTA text first.' });

    const db = admin();
    let project = null;
    let videoUrl = (body.video_url || '').trim();
    if (body.project_id) {
      const { data } = await db.from('video_edit_projects').select('*').eq('id', body.project_id).maybeSingle();
      if (!data || data.user_id !== user.id) return json(404, { error: 'Project not found.' });
      project = data;
      videoUrl = project.final_video_url || project.source_video_url;
    }
    if (!videoUrl) return json(400, { error: 'Missing video_url' });

    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    await downloadToFile(videoUrl, localVideo);
    const { width, height } = await probeDimensions(localVideo);

    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    const margin = Math.round(height * 0.06);
    drawCtaBanner(ctx, {
      text: ctaText, width, height, accentColor: accent, position,
      y: position === 'top' ? margin : height - margin,
    });
    const overlayPath = path.join(dir, 'overlay.png');
    const fs = require('fs/promises');
    await fs.writeFile(overlayPath, canvas.toBuffer('image/png'));

    const outPath = path.join(dir, 'out.mp4');
    await overlayImageOnVideo(localVideo, overlayPath, outPath);
    const finalUrl = await uploadToStorage(db, outPath, `${user.id}/cta-${Date.now()}.mp4`, 'video/mp4');
    if (project) await db.from('video_edit_projects').update({ final_video_url: finalUrl, updated_at: new Date().toISOString() }).eq('id', project.id);

    await cleanupTmp(jobId);
    return json(200, { url: finalUrl });
  } catch (e) {
    try { await cleanupTmp(jobId); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not add the CTA overlay.' });
  }
};
