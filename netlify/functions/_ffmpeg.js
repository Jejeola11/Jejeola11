// ============================================================
// Shared ffmpeg/ffprobe helpers for the Avatar Video pipeline.
// Binaries come from @ffmpeg-installer/ffmpeg + @ffprobe-installer/ffprobe —
// both are fully static builds distributed as plain npm packages (hosted on
// registry.npmjs.org, not GitHub Releases), so they install cleanly in every
// environment and need no system ffmpeg. netlify.toml force-includes both
// binaries in the function bundle (see the `included_files` comment there).
//
// Netlify Functions only allow writes under /tmp — every helper here reads
// and writes exclusively inside /tmp/avatar-video-<job>/ so concurrent jobs
// never collide, and the caller is responsible for cleanup (cleanupTmp).
// ============================================================
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');

const execFileP = promisify(execFile);
const FFMPEG = require('@ffmpeg-installer/ffmpeg').path;
const FFPROBE = require('@ffprobe-installer/ffprobe').path;

function workDir(jobId) {
  return path.join(os.tmpdir(), 'avvid-' + jobId);
}

async function ensureWorkDir(jobId) {
  const dir = workDir(jobId);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

async function cleanupTmp(jobId) {
  try { await fs.rm(workDir(jobId), { recursive: true, force: true }); } catch (e) {}
}

// Download a remote URL straight to a local file (streamed, no full-buffer hold).
async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Download failed (' + res.status + '): ' + url);
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
  return destPath;
}

async function ffmpeg(args) {
  try {
    return await execFileP(FFMPEG, args, { maxBuffer: 1024 * 1024 * 64 });
  } catch (e) {
    const stderr = (e && e.stderr) ? String(e.stderr).slice(-2000) : '';
    throw new Error('ffmpeg failed: ' + (stderr || e.message));
  }
}

// Duration in seconds (float), via ffprobe's format JSON — exact, not parsed
// from ffmpeg's human-readable banner.
async function probeDuration(filePath) {
  const { stdout } = await execFileP(FFPROBE, [
    '-v', 'error', '-show_entries', 'format=duration', '-of', 'json', filePath,
  ]);
  const j = JSON.parse(stdout);
  const d = parseFloat(j.format && j.format.duration);
  if (!isFinite(d)) throw new Error('Could not read duration of ' + filePath);
  return d;
}

// Extract a single frame at a given timestamp — used to pull the "master"
// identity still out of an uploaded training video (near the start, once
// the person is framed and settled, not mid-blink at frame 0).
async function extractFrameAt(videoPath, atSec, outPngPath) {
  await ffmpeg(['-y', '-ss', String(atSec), '-i', videoPath, '-frames:v', '1', '-q:v', '2', outPngPath]);
  return outPngPath;
}

// Extract the very last frame of a video as a PNG — used as the "hand-off"
// reference image so the next chunk's generation continues from exactly
// where this one ended, instead of resetting to the master identity photo.
async function extractLastFrame(videoPath, outPngPath) {
  // -sseof seeks from end-of-file; -0.5s is safely inside the final frame's
  // display window even for slightly variable frame timing. -update 1 makes
  // the single-image muxer overwrite in place instead of erroring.
  await ffmpeg(['-y', '-sseof', '-0.5', '-i', videoPath, '-frames:v', '1', '-update', '1', '-q:v', '2', outPngPath]);
  return outPngPath;
}

// Cut [startSec, startSec+durSec) out of an audio file into its own file.
// Re-encodes (rather than -c copy) so the cut lands on an exact sample
// boundary — this file becomes one chunk's dialogue track, and any drift
// here would throw off lip-sync for that whole chunk.
async function sliceAudio(inPath, startSec, durSec, outPath) {
  await ffmpeg(['-y', '-i', inPath, '-ss', String(startSec), '-t', String(durSec), '-acodec', 'aac', '-b:a', '192k', outPath]);
  return outPath;
}

// Concatenate speech-generation batches into one continuous track. Always
// re-encodes to AAC (batches may come back as mp3 or wav depending on the
// model) so the boundary is a clean sample-accurate splice, not a container
// mismatch.
async function concatAudio(batchPaths, outPath, jobId) {
  const dir = workDir(jobId);
  const listPath = path.join(dir, 'concat-audio-list.txt');
  const listBody = batchPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, listBody);
  await ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-acodec', 'aac', '-b:a', '192k', outPath]);
  return outPath;
}

// Concatenate video chunks that all share codec/container (true here — every
// chunk comes off the same WaveSpeed model back-to-back) via the fast
// stream-copy concat demuxer. Falls back to a re-encoding concat filter if
// the chunks turn out not to be stream-compatible.
// `hasAudio` should be false for silent chunks (e.g. motion-mode Seedance
// clips, which carry no audio track at all) — the audio-fallback filter
// below would otherwise fail trying to map a stream that doesn't exist.
async function concatVideos(chunkPaths, outPath, jobId, { hasAudio = true } = {}) {
  const dir = workDir(jobId);
  const listPath = path.join(dir, 'concat-list.txt');
  const listBody = chunkPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, listBody);
  try {
    await ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
  } catch (e) {
    // Stream copy failed (e.g. a subtly different codec profile) — re-encode.
    const inputs = chunkPaths.flatMap((p) => ['-i', p]);
    if (hasAudio) {
      const filter = chunkPaths.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('') + `concat=n=${chunkPaths.length}:v=1:a=1[v][a]`;
      await ffmpeg(['-y', ...inputs, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-c:a', 'aac', outPath]);
    } else {
      const filter = chunkPaths.map((_, i) => `[${i}:v:0]`).join('') + `concat=n=${chunkPaths.length}:v=1:a=0[v]`;
      await ffmpeg(['-y', ...inputs, '-filter_complex', filter, '-map', '[v]', '-c:v', 'libx264', outPath]);
    }
  }
  return outPath;
}

// Mux a separate narration track onto a (possibly silent) video — used to
// attach the full narration to a motion-mode video, since Seedance's image-
// to-video chunks carry no audio of their own. -shortest trims to whichever
// input is shorter, so a slight chunk-count/narration-length mismatch never
// produces a frozen tail or a looping one.
async function muxAudio(videoPath, audioPath, outPath) {
  await ffmpeg(['-y', '-i', videoPath, '-i', audioPath, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', outPath]);
  return outPath;
}

// Get pixel dimensions (for sizing a CTA overlay to match exactly).
async function probeDimensions(filePath) {
  const { stdout } = await execFileP(FFPROBE, [
    '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'json', filePath,
  ]);
  const j = JSON.parse(stdout);
  const s = j.streams && j.streams[0];
  if (!s) throw new Error('Could not read video dimensions of ' + filePath);
  return { width: s.width, height: s.height };
}

// Composite a transparent PNG overlay (e.g. a CTA card/button rendered via
// _canvas.js) over the full duration of a video — used to make a finished
// clip ad-ready with a burned-in CTA for IG/TikTok/ad placements.
async function overlayImageOnVideo(videoPath, overlayPngPath, outPath) {
  // Overlaying always re-encodes (pixel data changes) — veryfast keeps this
  // from becoming the slowest step for a long avatar video.
  await ffmpeg(['-y', '-i', videoPath, '-i', overlayPngPath, '-filter_complex', '[0:v][1:v]overlay=0:0:format=auto', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', outPath]);
  return outPath;
}

// Composite an uploaded image element (e.g. a proof screenshot) onto a
// video for only a chosen time window — Video Editing Studio's "add
// elements at a timestamp" feature.
async function overlayImageAtTime(videoPath, overlayPngPath, outPath, { x = 0, y = 0, startSec = 0, endSec }) {
  const enable = endSec != null ? `enable='between(t,${startSec},${endSec})'` : `enable='gte(t,${startSec})'`;
  await ffmpeg(['-y', '-i', videoPath, '-i', overlayPngPath, '-filter_complex', `[0:v][1:v]overlay=${x}:${y}:${enable}:format=auto`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', outPath]);
  return outPath;
}

// Composite MANY timed, full-frame overlays (e.g. one PNG per caption
// phrase) in a SINGLE ffmpeg pass — chains N overlay filters, each gated to
// its own [start,end] window, rather than re-encoding once per caption
// (which would be N times slower and re-compound quality loss each pass).
// Scoped to typical short-form clip lengths (a few dozen captions) — an
// extremely long video with hundreds of captions could hit filter-graph
// size limits; not a concern for the vertical-video use case this serves.
async function overlayTimedImages(videoPath, overlays, outPath) {
  if (!overlays.length) { await ffmpeg(['-y', '-i', videoPath, '-c', 'copy', outPath]); return outPath; }
  const inputs = ['-i', videoPath, ...overlays.flatMap((o) => ['-i', o.pngPath])];
  const filters = overlays.map((o, i) => {
    const src = i === 0 ? '[0:v]' : `[v${i}]`;
    const dst = i === overlays.length - 1 ? '[vout]' : `[v${i + 1}]`;
    return `${src}[${i + 1}:v]overlay=0:0:enable='between(t,${o.start},${o.end})'${dst}`;
  }).join(';');
  await ffmpeg(['-y', ...inputs, '-filter_complex', filters, '-map', '[vout]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-c:a', 'copy', outPath]);
  return outPath;
}

// Upload a local file to Supabase Storage (server-side, service-role — bypasses
// RLS) and return its public URL, the same 'avatars' bucket the front-end
// already uploads training photos/video/voice samples into.
async function uploadToStorage(db, localPath, storagePath, contentType, bucket = 'avatars') {
  const buf = await fs.readFile(localPath);
  const { error } = await db.storage.from(bucket).upload(storagePath, buf, { contentType, upsert: true });
  if (error) throw new Error('Storage upload failed: ' + error.message);
  return db.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

module.exports = {
  workDir, ensureWorkDir, cleanupTmp, downloadToFile, ffmpeg,
  probeDuration, probeDimensions, extractFrameAt, extractLastFrame, sliceAudio, concatAudio, concatVideos,
  muxAudio, overlayImageOnVideo, overlayImageAtTime, overlayTimedImages, uploadToStorage,
};
