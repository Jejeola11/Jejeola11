// ============================================================
// POST /.netlify/functions/video-cta   (burn in a CTA — ad/IG/TikTok ready)
// Body: { video_url, cta_text, position?, accent_color? }
// Takes ANY finished video (avatar video, general Studio video) and burns
// in a bold "comment a word" / "tap below" CTA banner so it's ready to post
// or run as an ad straight out of the studio — every piece of content
// should convert, not just look good.
// Synchronous: overlaying is a single fast re-encode pass (veryfast preset),
// not a new AI generation — no credit charge, composite as many times as
// you like while you dial in the wording.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, probeDimensions, overlayImageOnVideo, uploadToStorage } = require('./_ffmpeg');
const { createCanvas, drawCtaBanner } = require('./_canvas');
const path = require('path');

exports.handler = async (event) => {
  const jobId = 'cta-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const videoUrl = (body.video_url || '').trim();
    const ctaText = (body.cta_text || '').trim();
    const position = body.position === 'top' ? 'top' : 'bottom';
    const accent = body.accent_color || '#00e0c6';
    if (!videoUrl) return json(400, { error: 'Missing video_url' });
    if (!ctaText) return json(400, { error: 'Write the CTA text first.' });

    const db = admin();
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

    await cleanupTmp(jobId);
    return json(200, { url: finalUrl });
  } catch (e) {
    try { await cleanupTmp(jobId); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not add the CTA overlay.' });
  }
};
