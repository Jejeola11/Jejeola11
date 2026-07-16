// ============================================================
// Flyer Studio — server-side compositing (typography, badges, panels).
// Uses @napi-rs/canvas (native, browser-free) instead of headless Chromium —
// a full Chromium+Puppeteer stack for this would be 75MB+ and risks blowing
// Netlify's function size limit; @napi-rs/canvas does the same crisp,
// fully-controlled text rendering at ~32MB and needs no browser at all.
// Self-hosted fonts only (never a web font link — this sandbox's proxy cert
// isn't trusted by any renderer here, so a live font URL fails silently);
// the flyer-designer Claude Skill's font set is reused as-is.
// ============================================================
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs = require('fs');

const FONT_DIR = path.join(__dirname, '..', '..', '.claude', 'skills', 'flyer-designer', 'fonts');

// role -> font file + the family name we register it under.
const FONT_ROLES = {
  display: { file: 'BigShoulders-Bold.ttf', family: 'FlyerDisplay' },       // heavy condensed headline sans
  script: { file: 'NothingYouCouldDo-Regular.ttf', family: 'FlyerScript' }, // handwritten accent-word flourish
  body: { file: 'WorkSans-Regular.ttf', family: 'FlyerBody' },              // subhead / bullets
  bodyBold: { file: 'WorkSans-Bold.ttf', family: 'FlyerBodyBold' },
  mono: { file: 'JetBrainsMono-Regular.ttf', family: 'FlyerMono' },         // footer / tech-credible chips
};

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  for (const role of Object.values(FONT_ROLES)) {
    const p = path.join(FONT_DIR, role.file);
    if (fs.existsSync(p)) GlobalFonts.registerFromPath(p, role.family);
  }
  fontsRegistered = true;
}

function hexToRgba(hex, alpha = 1) {
  const h = (hex || '#ffffff').replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Draw an image "cover"-fit into a w x h box (crop to fill, no distortion).
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
  else { sh = img.width / br; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Word-wrap into lines that fit maxWidth at the given font.
function wrapText(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Headline: 2-3 lines, heavy condensed display font, one word/phrase in the
// accent color (or a script flourish) — per the anchor template's layer 4.
// `accentWord` (optional) is matched case-insensitively against the wrapped
// words and recolored/re-fonted; if omitted, the LAST word of the headline
// gets the treatment (matches the "one word breaks into accent" pattern
// seen across the reference set).
function drawHeadline(ctx, { text, x, y, maxWidth, fontSize, accentColor, accentWord, scriptAccent, align = 'left' }) {
  ensureFonts();
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.font = `900 ${fontSize}px "${FONT_ROLES.display.family}"`;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.05;
  const target = (accentWord || '').toLowerCase();
  lines.forEach((line, i) => {
    const ly = y + i * lineHeight;
    const words = line.split(' ');
    const isLastLine = i === lines.length - 1;
    let matchIdx = target ? words.findIndex((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '') === target) : -1;
    if (matchIdx === -1 && !target && isLastLine) matchIdx = words.length - 1;
    if (matchIdx === -1) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, x, ly);
      return;
    }
    // Draw word-by-word so only the matched word gets the accent treatment.
    let cursorX = x;
    const widths = words.map((w) => ctx.measureText(w + ' ').width);
    if (align === 'center') {
      const total = widths.reduce((a, b) => a + b, 0) - ctx.measureText(' ').width;
      cursorX = x - total / 2;
    }
    const prevAlign = ctx.textAlign; ctx.textAlign = 'left';
    words.forEach((w, wi) => {
      if (wi === matchIdx && scriptAccent) {
        ctx.font = `${fontSize * 0.9}px "${FONT_ROLES.script.family}"`;
        ctx.fillStyle = accentColor;
        ctx.fillText(w, cursorX, ly + fontSize * 0.05);
        ctx.font = `900 ${fontSize}px "${FONT_ROLES.display.family}"`;
      } else if (wi === matchIdx) {
        ctx.fillStyle = accentColor;
        ctx.fillText(w, cursorX, ly);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(w, cursorX, ly);
      }
      cursorX += widths[wi];
    });
    ctx.textAlign = prevAlign;
  });
  return lines.length * lineHeight;
}

function drawSubhead(ctx, { text, x, y, maxWidth, fontSize = 28, color = '#ffffff', align = 'left' }) {
  ensureFonts();
  ctx.font = `${fontSize}px "${FONT_ROLES.body.family}"`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const lines = wrapText(ctx, text, maxWidth);
  const lh = fontSize * 1.3;
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  return lines.length * lh;
}

// Info card: rounded panel with bulleted lines, one small accent-colored
// marker per bullet — per anchor template layer 5.
function drawInfoCard(ctx, { x, y, w, bullets, accentColor, glass = false, fontSize = 22 }) {
  ensureFonts();
  const pad = 24, gap = fontSize * 1.5;
  const h = pad * 2 + bullets.length * gap;
  ctx.fillStyle = glass ? hexToRgba('#ffffff', 0.08) : hexToRgba('#0a0a0a', 0.55);
  roundRect(ctx, x, y, w, h, 18); ctx.fill();
  if (glass) { ctx.strokeStyle = hexToRgba('#ffffff', 0.18); ctx.lineWidth = 1; roundRect(ctx, x, y, w, h, 18); ctx.stroke(); }
  ctx.font = `${fontSize}px "${FONT_ROLES.body.family}"`;
  ctx.textBaseline = 'middle';
  bullets.forEach((b, i) => {
    const by = y + pad + gap * i + fontSize * 0.5;
    ctx.fillStyle = accentColor;
    ctx.beginPath(); ctx.arc(x + pad + 6, by, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(b, x + pad + 24, by);
  });
  return h;
}

// Small pill/chip badge (price, date, "NEW" seal) — layer 6 micro-motif.
function drawBadge(ctx, { text, x, y, accentColor, fontSize = 18 }) {
  ensureFonts();
  ctx.font = `700 ${fontSize}px "${FONT_ROLES.bodyBold.family}"`;
  const padX = 18, padY = 10;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2, h = fontSize + padY * 2;
  ctx.fillStyle = accentColor;
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  return { w, h };
}

// Contact footer bar — layer 7. Styled as UI chrome (mono font, separated
// by a solid color break), not part of the "art."
function drawFooterBar(ctx, { text, width, y, height, accentColor, bg = '#0a0a0a' }) {
  ensureFonts();
  ctx.fillStyle = bg;
  ctx.fillRect(0, y, width, height);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, y, width, 3);
  ctx.font = `${Math.round(height * 0.32)}px "${FONT_ROLES.mono.family}"`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, y + height / 2 + height * 0.05);
}

module.exports = {
  createCanvas, loadImage, ensureFonts, FONT_ROLES,
  drawCover, wrapText, roundRect, drawHeadline, drawSubhead, drawInfoCard, drawBadge, drawFooterBar, hexToRgba,
};
