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
async function concatVideos(chunkPaths, outPath, jobId) {
  const dir = workDir(jobId);
  const listPath = path.join(dir, 'concat-list.txt');
  const listBody = chunkPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
  await fs.writeFile(listPath, listBody);
  try {
    await ffmpeg(['-y', '-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', outPath]);
  } catch (e) {
    // Stream copy failed (e.g. a subtly different codec profile) — re-encode.
    const inputs = chunkPaths.flatMap((p) => ['-i', p]);
    const filter = chunkPaths.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('') + `concat=n=${chunkPaths.length}:v=1:a=1[v][a]`;
    await ffmpeg(['-y', ...inputs, '-filter_complex', filter, '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-c:a', 'aac', outPath]);
  }
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
  probeDuration, extractFrameAt, extractLastFrame, sliceAudio, concatAudio, concatVideos, uploadToStorage,
};
