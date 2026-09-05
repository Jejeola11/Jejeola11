// ============================================================
// Video Editing Studio — caption generation.
// Renders each caption phrase as its own transparent PNG card via
// @napi-rs/canvas (full color/gradient/effect control — solid color,
// gradient fills, a highlight box, or a soft glow), then composites all of
// them onto the video in ONE ffmpeg pass via chained timed overlays
// (_ffmpeg.js's overlayTimedImages) — each card's overlay is only enabled
// during its own [start,end] window.
//
// This replaced an earlier ASS/libass-based version: standard subtitle
// styling can't do a true gradient text fill or a soft glow, and the
// founder explicitly wants real color/effect choice, not just "captions on
// or off" — canvas gives the same full design control already used for
// Flyer Studio's typography.
//
// Style: bold phrase-by-phrase cards (~2s each, breaking at word
// boundaries) — the dominant "big bold caption" convention across viral
// short-form video. Built from Whisper's word-level timestamps when
// available; degrades gracefully to segment-level, then to one static
// card for the whole clip if only plain text came back.
// ============================================================
const { createCanvas, ensureFonts, FONT_ROLES, wrapText, roundRect, hexToRgba } = require('./_canvas');

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

// Perceived luminance — used to auto-pick black/white text on a colored
// highlight-box so it's always legible regardless of which color is chosen.
function luminance(hex) {
  const h = (hex || '#ffffff').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

// Render ONE caption phrase as a transparent PNG, full video-frame sized
// (the text is positioned within it; ffmpeg overlays the whole frame at
// 0,0 so no per-card position math is needed at composite time).
function renderCaptionCard({ text, width, height, style = {} }) {
  ensureFonts();
  const effect = style.effect || 'solid';
  const color = style.color || '#ffffff';
  const gradientColors = (style.gradientColors && style.gradientColors.length === 2) ? style.gradientColors : [color, style.color2 || '#00e0c6'];
  const position = style.position === 'top' ? 'top' : 'bottom';

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const fontSize = Math.round(width * 0.075);
  ctx.font = `900 ${fontSize}px "${FONT_ROLES.display.family}"`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

  const maxWidth = width * 0.86;
  const upper = text.toUpperCase();
  const lines = wrapText(ctx, upper, maxWidth).slice(0, 2);
  const lineHeight = fontSize * 1.15;
  const blockHeight = lines.length * lineHeight;
  const centerY = position === 'top' ? height * 0.16 + blockHeight / 2 : height * 0.82 - blockHeight / 2;

  if (effect === 'highlight-box') {
    const padX = fontSize * 0.6, padY = fontSize * 0.35;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const boxW = widest + padX * 2, boxH = blockHeight + padY * 2;
    ctx.fillStyle = color;
    roundRect(ctx, (width - boxW) / 2, centerY - boxH / 2, boxW, boxH, fontSize * 0.25);
    ctx.fill();
    ctx.fillStyle = luminance(color) > 0.55 ? '#0a0a0a' : '#ffffff';
    lines.forEach((line, i) => ctx.fillText(line, width / 2, centerY - blockHeight / 2 + lineHeight * (i + 0.5)));
  } else if (effect === 'gradient') {
    lines.forEach((line, i) => {
      const y = centerY - blockHeight / 2 + lineHeight * (i + 0.5);
      const w = ctx.measureText(line).width;
      const grad = ctx.createLinearGradient(width / 2 - w / 2, 0, width / 2 + w / 2, 0);
      grad.addColorStop(0, gradientColors[0]); grad.addColorStop(1, gradientColors[1]);
      ctx.strokeStyle = hexToRgba('#000000', 0.9); ctx.lineWidth = Math.round(fontSize * 0.09);
      ctx.strokeText(line, width / 2, y);
      ctx.fillStyle = grad;
      ctx.fillText(line, width / 2, y);
    });
  } else if (effect === 'glow') {
    lines.forEach((line, i) => {
      const y = centerY - blockHeight / 2 + lineHeight * (i + 0.5);
      ctx.shadowColor = color; ctx.shadowBlur = fontSize * 0.35;
      ctx.fillStyle = color;
      ctx.fillText(line, width / 2, y);
      ctx.fillText(line, width / 2, y); // second pass deepens the glow without blowing out the core fill
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.92;
      ctx.fillText(line, width / 2, y);
      ctx.globalAlpha = 1;
    });
  } else { // 'solid'
    lines.forEach((line, i) => {
      const y = centerY - blockHeight / 2 + lineHeight * (i + 0.5);
      ctx.strokeStyle = hexToRgba('#000000', 0.9); ctx.lineWidth = Math.round(fontSize * 0.09);
      ctx.strokeText(line, width / 2, y);
      ctx.fillStyle = color;
      ctx.fillText(line, width / 2, y);
    });
  }

  return canvas.toBuffer('image/png');
}

module.exports = { chunkWords, extractWords, renderCaptionCard };
