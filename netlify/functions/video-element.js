// ============================================================
// POST /.netlify/functions/video-element   (Video Editing Studio)
// Body: { project_id, image_url, start_sec, duration_sec, position? }
// Composites an uploaded element (a proof screenshot, logo, sticker) onto
// the project's current working video for a chosen time window — appears
// exactly when it's relevant, not floating over the whole clip. Operates
// on video_edit_projects.final_video_url (falling back to the source video
// on the first element), same "current working file" pattern as Flyer
// Studio's hero_image_url. Synchronous — a single ffmpeg overlay pass.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, overlayImageAtTime, uploadToStorage } = require('./_ffmpeg');
const { probeDimensions } = require('./_ffprobe');
const { loadImage, createCanvas } = require('./_canvas');
const path = require('path');
const fs = require('fs/promises');

const POSITIONS = {
  center: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round((h - eh) / 2) }),
  top: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round(h * 0.08) }),
  bottom: (w, h, ew, eh) => ({ x: Math.round((w - ew) / 2), y: Math.round(h * 0.62) }),
};

exports.handler = async (event) => {
  const jobId = 'element-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const imageUrl = (body.image_url || '').trim();
    const startSec = Number(body.start_sec) || 0;
    const durationSec = body.duration_sec != null ? Number(body.duration_sec) : null;
    const position = POSITIONS[body.position] ? body.position : 'center';
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!imageUrl) return json(400, { error: 'Missing image_url' });

    const db = admin();
    const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    const workingUrl = project.final_video_url || project.source_video_url;

    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    await downloadToFile(workingUrl, localVideo);
    const { width, height } = await probeDimensions(localVideo);

    // Scale the element to a sensible max width (40% of frame) so a huge
    // upload doesn't swallow the whole video.
    const imgRes = await fetch(imageUrl);
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const img = await loadImage(imgBuf);
    const maxW = width * 0.42;
    const scale = Math.min(1, maxW / img.width);
    const ew = Math.round(img.width * scale), eh = Math.round(img.height * scale);
    const canvas = createCanvas(ew, eh);
    canvas.getContext('2d').drawImage(img, 0, 0, ew, eh);
    const elementPath = path.join(dir, 'element.png');
    await fs.writeFile(elementPath, canvas.toBuffer('image/png'));

    const { x, y } = POSITIONS[position](width, height, ew, eh);
    const outPath = path.join(dir, 'out.mp4');
    await overlayImageAtTime(localVideo, elementPath, outPath, { x, y, startSec, endSec: durationSec != null ? startSec + durationSec : null });
    const finalUrl = await uploadToStorage(db, outPath, `${user.id}/element-${projectId}-${Date.now()}.mp4`, 'video/mp4');

    const elements = (Array.isArray(project.elements) ? project.elements : []).concat([{ image_url: imageUrl, start_sec: startSec, duration_sec: durationSec, position, created_at: new Date().toISOString() }]);
    await db.from('video_edit_projects').update({ final_video_url: finalUrl, elements, updated_at: new Date().toISOString() }).eq('id', projectId);
    await cleanupTmp(jobId);
    return json(200, { url: finalUrl });
  } catch (e) {
    try { await cleanupTmp(jobId); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not add that element.' });
  }
};
