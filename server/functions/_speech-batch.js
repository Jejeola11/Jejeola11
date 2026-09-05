// ============================================================
// Pure, zero-dependency script-batching helper. Split out of _avatar-video.js
// specifically so job-status.js's Resemble audio-job branch doesn't have to
// pull in that entire file (and its ffprobe dependency via _ffmpeg.js) just
// for these two trivial exports -- job-status.js is the most frequently
// invoked function in the whole app, and every function that transitively
// requires a heavy native binary gets its own full copy bundled in, so
// keeping its dependency graph minimal matters far more than it does for a
// rarely-called function.
// ============================================================
// Comfortably under the ~6,180-char length confirmed WaveSpeed accepts at
// submit time for a single omnivoice/voice-clone call.
const SPEECH_BATCH_CHARS = 3000;
// Resemble's sync /synthesize is a MUCH smaller ceiling than WaveSpeed's --
// confirmed live 2026-07-17: a ~270-word (~1,650 char) single Resemble call
// came back as an outright 504, and a real ~300-word script that DID return
// audio came back with words dropped/substituted and at least one fully
// hallucinated phrase throughout -- a classic long-single-shot-TTS failure
// mode. Every short test (~50-350 chars) came back clean. Keeping batches
// well under that failure zone.
const RESEMBLE_BATCH_CHARS = 450;

// Split a script into batches at sentence boundaries, each <= maxChars. A
// single sentence longer than maxChars is hard-split (rare, but must not
// throw).
function splitScript(script, maxChars = SPEECH_BATCH_CHARS) {
  const sentences = script.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) || [script];
  const batches = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > maxChars && cur) { batches.push(cur.trim()); cur = ''; }
    if (s.length > maxChars) {
      // one giant sentence — hard-split it
      for (let i = 0; i < s.length; i += maxChars) batches.push(s.slice(i, i + maxChars).trim());
      continue;
    }
    cur += s;
  }
  if (cur.trim()) batches.push(cur.trim());
  return batches.filter(Boolean);
}

module.exports = { splitScript, SPEECH_BATCH_CHARS, RESEMBLE_BATCH_CHARS };
