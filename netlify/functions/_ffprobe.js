// ============================================================
// ffprobe-only helpers, split out of _ffmpeg.js. @ffprobe-installer/ffprobe
// is a separate ~76MB native binary from @ffmpeg-installer/ffmpeg (~66MB) --
// _ffmpeg.js used to require both unconditionally at module load, so EVERY
// function that imported it (even ones that only ever call plain ffmpeg())
// got both binaries bundled in. Netlify Functions duplicate external native
// packages per function rather than sharing them, so that "just in case"
// bundling adds up fast across many functions -- keeping this genuinely
// separate means a function only pays for ffprobe if it actually calls
// probeDuration/probeDimensions.
// ============================================================
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileP = promisify(execFile);
const FFPROBE = require('@ffprobe-installer/ffprobe').path;

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

module.exports = { probeDuration, probeDimensions };
