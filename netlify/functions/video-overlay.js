// ============================================================
// POST /.netlify/functions/video-overlay   (Video Editing Studio)
// Body: { type: 'caption' | 'cta' | 'element', ...type-specific fields }
// Merged from three formerly-separate functions (video-caption-apply.js,
// video-cta.js, video-element.js) — they shared an almost identical shape
// (download the working video, probe its dimensions, build a PNG overlay,
// composite it in with one ffmpeg pass, upload, save back onto the
// project) but were three separate Netlify Functions, meaning each got
// its OWN full duplicate copy of ffmpeg+ffprobe+canvas bundled in
// (Netlify doesn't share/dedupe native binaries across functions) --
// ~174MB x 3 = ~522MB for what's fundamentally one job with three modes.
// Merging into one function cuts that to ~174MB total, a real fix for the
// "build ran out of disk space" deploy failures, not just a rename.
// Synchronous in every mode — no credit charge, just a re-encode pass.
//
//   type:'caption'  — { project_id, effect?, color?, color2?, position? }
//   type:'cta'      — { video_url?, project_id?, cta_text, position?, accent_color? }
//   type:'element'  — { project_id, image_url, start_sec, duration_sec, position? }
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, overlayImageOnVideo, overlayImageAtTime, overlayTimedImages, uploadToStorage } = require('./_ffmpeg');
const { probeDimensions } = require('./_ffprobe');
const { createCanvas, loadImage, drawCtaBanner } = require('./_canvas');
const { chunkWords, extractWords, renderCaptionCard } = require('./_captions');
const path = require('path');
const fs = require('fs/promises');

const CTA_POSITIONS = { top: 'top', bottom: 'bottom' };
const ELEMENT_POSITIONS = {
  center: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round((h - eh) / 2) }),
  top: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round(h * 0.08) }),
  bottom: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round(h * 0.62) }),
};
const CAPTION_EFFECTS = ['solid', 'gradient', 'highlight-box', 'glow'];

exports.handler = async (event) => {
  const jobId = 'ovl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const type = body.type;
    if (!['caption', 'cta', 'element'].includes(type)) return json(400, { error: 'Missing or unknown type.' });

    const db = admin();
    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    const outPath = path.join(dir, 'out.mp4');

    if (type === 'caption') {
      const projectId = body.project_id;
      if (!projectId) return json(400, { error: 'Missing project_id' });
      const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
      if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
      if (!project.transcript) return json(400, { error: 'Transcribe the video first.' });

      const style = {
        effect: CAPTION_EFFECTS.includes(body.effect) ? body.effect : 'solid',
        color: body.color || '#ffffff',
        color2: body.color2 || '#00e0c6',
        position: body.position === 'top' ? 'top' : 'bottom',
      };

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

      await overlayTimedImages(localVideo, overlays, outPath);
      const finalUrl = await uploadToStorage(db, outPath, `${user.id}/caption-${projectId}-${Date.now()}.mp4`, 'video/mp4');
      await db.from('video_edit_projects').update({ captioned_video_url: finalUrl, final_video_url: finalUrl, caption_style: style, updated_at: new Date().toISOString() }).eq('id', projectId);
      await cleanupTmp(jobId);
      return json(200, { url: finalUrl });
    }

    if (type === 'cta') {
      const ctaText = (body.cta_text || '').trim();
      const position = CTA_POSITIONS[body.position] || 'bottom';
      const accent = body.accent_color || '#00e0c6';
      if (!ctaText) return json(400, { error: 'Write the CTA text first.' });

      let project = null;
      let videoUrl = (body.video_url || '').trim();
      if (body.project_id) {
        const { data } = await db.from('video_edit_projects').select('*').eq('id', body.project_id).maybeSingle();
        if (!data || data.user_id !== user.id) return json(404, { error: 'Project not found.' });
        project = data;
        videoUrl = project.final_video_url || project.source_video_url;
      }
      if (!videoUrl) return json(400, { error: 'Missing video_url' });

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
      await fs.writeFile(overlayPath, canvas.toBuffer('image/png'));

      await overlayImageOnVideo(localVideo, overlayPath, outPath);
      const finalUrl = await uploadToStorage(db, outPath, `${user.id}/cta-${Date.now()}.mp4`, 'video/mp4');
      if (project) await db.from('video_edit_projects').update({ final_video_url: finalUrl, updated_at: new Date().toISOString() }).eq('id', project.id);
      await cleanupTmp(jobId);
      return json(200, { url: finalUrl });
    }

    // type === 'element'
    const projectId = body.project_id;
    const imageUrl = (body.image_url || '').trim();
    const startSec = Number(body.start_sec) || 0;
    const durationSec = body.duration_sec != null ? Number(body.duration_sec) : null;
    const position = ELEMENT_POSITIONS[body.position] ? body.position : 'center';
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!imageUrl) return json(400, { error: 'Missing image_url' });

    const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    const workingUrl = project.final_video_url || project.source_video_url;

    await downloadToFile(workingUrl, localVideo);
    const { width, height } = await probeDimensions(localVideo);

    const imgRes = await fetch(imageUrl);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const img = await loadImage(imgBuf);
    const maxW = width * 0.42;
    const scale = Math.min(1, maxW / img.width);
    const ew = Math.round(img.width * scale), eh = Math.round(img.height * scale);
    const elCanvas = createCanvas(ew, eh);
    elCanvas.getContext('2d').drawImage(img, 0, 0, ew, eh);
    const elementPath = path.join(dir, 'element.png');
    await fs.writeFile(elementPath, elCanvas.toBuffer('image/png'));

    const { x, y } = ELEMENT_POSITIONS[position](width, height, ew, eh);
    await overlayImageAtTime(localVideo, elementPath, outPath, { x, y, startSec, endSec: durationSec != null ? startSec + durationSec : null });
    const finalUrl = await uploadToStorage(db, outPath, `${user.id}/element-${projectId}-${Date.now()}.mp4`, 'video/mp4');

    const elements = (Array.isArray(project.elements) ? project.elements : []).concat([{ image_url: imageUrl, start_sec: startSec, duration_sec: durationSec, position, created_at: new Date().toISOString() }]);
    await db.from('video_edit_projects').update({ final_video_url: finalUrl, elements, updated_at: new Date().toISOString() }).eq('id', projectId);
    await cleanupTmp(jobId);
    return json(200, { url: finalUrl });
  } catch (e) {
    try { await cleanupTmp(jobId); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not apply that overlay.' });
  }
};
