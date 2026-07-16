// ============================================================
// Video Editing Studio — caption generation (ASS subtitles via libass).
// Rendering captions as an .ass file through ffmpeg's `subtitles`/`ass`
// filter (libass — confirmed built into our bundled ffmpeg) is the right
// tool here instead of compositing per-frame PNG overlays: one lightweight
// pass, standard, and it's what every real captioning pipeline uses.
//
// Style: bold phrase-by-phrase cards (~2s each, breaking at word
// boundaries) — the dominant "big bold caption" convention across viral
// short-form video. Built from Whisper's word-level timestamps when
// available; degrades gracefully to segment-level, then to one static
// card for the whole clip if only plain text came back.
// ============================================================
const fs = require('fs/promises');

function assColor(hex, alphaHex = '00') {
  const h = (hex || '#ffffff').replace('#', '');
  const r = h.slice(0, 2), g = h.slice(2, 4), b = h.slice(4, 6);
  return `&H${alphaHex}${b}${g}${r}`.toUpperCase();
}

function assTime(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(2).padStart(5, '0')}`;
}

// Group words (or segments) into ~maxSec chunks, breaking at word
// boundaries — the "phrase card" unit captions are displayed as.
function chunkWords(words, maxSec = 2.0, maxWords = 5) {
  const chunks = [];
  let cur = [];
  let chunkStart = null;
  for (const w of words) {
    if (chunkStart === null) chunkStart = w.start;
    cur.push(w);
    const dur = w.end - chunkStart;
    if (cur.length >= maxWords || dur >= maxSec) {
      chunks.push({ start: chunkStart, end: w.end, text: cur.map((x) => x.word).join(' ').trim() });
      cur = []; chunkStart = null;
    }
  }
  if (cur.length) chunks.push({ start: chunkStart, end: cur[cur.length - 1].end, text: cur.map((x) => x.word).join(' ').trim() });
  return chunks;
}

// Normalize whatever shape the transcript is in (word-level, segment-level,
// or plain text) into a flat words[] array with {word, start, end}.
function extractWords(transcript) {
  if (!transcript) return [];
  if (Array.isArray(transcript.words) && transcript.words.length) {
    return transcript.words.map((w) => ({ word: (w.word || w.text || '').trim(), start: w.start, end: w.end })).filter((w) => w.word);
  }
  if (Array.isArray(transcript.segments) && transcript.segments.length) {
    const words = [];
    for (const seg of transcript.segments) {
      const text = (seg.text || '').trim();
      if (!text) continue;
      const parts = text.split(/\s+/);
      const dur = (seg.end - seg.start) / parts.length;
      parts.forEach((p, i) => words.push({ word: p, start: seg.start + i * dur, end: seg.start + (i + 1) * dur }));
    }
    return words;
  }
  return [];
}

// Build the .ass file content for a video of the given dimensions.
function buildAssFile({ transcript, width, height, fontRole = 'Arial', accentColor = '#00e0c6', position = 'bottom' }) {
  const words = extractWords(transcript);
  const alignment = position === 'top' ? 8 : 2; // libass numpad alignment: 8=top-center, 2=bottom-center
  const marginV = Math.round(height * 0.12);
  const fontSize = Math.round(width * 0.06);

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${fontRole},${fontSize},${assColor('#ffffff')},${assColor(accentColor)},${assColor('#000000')},${assColor('#000000')},-1,0,0,0,100,100,0,0,1,${Math.round(fontSize * 0.08)},0,${alignment},40,40,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  let events;
  if (words.length) {
    const chunks = chunkWords(words);
    events = chunks.map((c) => `Dialogue: 0,${assTime(c.start)},${assTime(c.end)},Default,,0,0,0,,${c.text.toUpperCase().replace(/\n/g, ' ')}`).join('\n');
  } else if (transcript && transcript.text) {
    events = `Dialogue: 0,0:00:00.00,9:59:59.00,Default,,0,0,0,,${transcript.text.toUpperCase()}`;
  } else {
    events = '';
  }
  return header + events + '\n';
}

async function writeAssFile(path, opts) {
  await fs.writeFile(path, buildAssFile(opts));
  return path;
}

module.exports = { buildAssFile, writeAssFile, chunkWords, extractWords, assColor, assTime };
