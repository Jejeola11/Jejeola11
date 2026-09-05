// ============================================================
// Flyer Studio — server-side compositing (typography, badges, panels).
// Uses @napi-rs/canvas (native, browser-free) instead of headless Chromium —
// a full Chromium+Puppeteer stack for this would be 75MB+ and risks blowing
// Netlify's function size limit; @napi-rs/canvas does the same crisp,
// fully-controlled text rendering at ~32MB and needs no browser at all.
// Self-hosted fonts only (never a web font link — this sandbox's proxy cert
// isn't trusted by any renderer here, so a live font URL fails silently);
// the flyer-designer Claude Skill's font set is reused as-is.
//
// Fonts are embedded as base64 in _flyer-fonts-data.js (require()'d, not
// read from disk at runtime): Netlify's esbuild function bundler only
// traces require()/import calls to decide what ships in the deployed
// function — it has zero visibility into fs.readFileSync()'d paths, so the
// actual .ttf files were silently left out of every deploy (same blind
// spot already documented below for @ffmpeg-installer/@napi-rs/canvas's own
// native binary, just for font files instead). That meant NO custom font
// ever registered in production, and — unlike this dev sandbox, which
// happens to have ~22 system font families installed as a fallback —
// Netlify's actual function runtime has no fonts at all to fall back to,
// so every fillText() silently drew nothing while fillRect/arc shapes
// (badge pills, bullet dots, the footer accent line) drew fine regardless,
// producing a flyer with all its background shapes but zero text.
// require()-ing the data module guarantees the bytes are bundled.
const { createCanvas, GlobalFonts, loadImage } = require('@napi-rs/canvas');
const FONT_DATA = require('./_flyer-fonts-data');
const { FONT_LIBRARY, FONT_DATA: LIBRARY_FONT_DATA } = require('./_flyer-fonts-library');

// role -> base64 key (from FONT_DATA) + the family name we register it under.
const FONT_ROLES = {
  display: { key: 'display', family: 'FlyerDisplay' },       // heavy condensed headline sans
  script: { key: 'script', family: 'FlyerScript' },           // handwritten accent-word flourish
  body: { key: 'body', family: 'FlyerBody' },                 // subhead / bullets
  bodyBold: { key: 'bodyBold', family: 'FlyerBodyBold' },
  mono: { key: 'mono', family: 'FlyerMono' },                 // footer / tech-credible chips
};

let fontsRegistered = false;
function ensureFonts() {
  if (fontsRegistered) return;
  for (const role of Object.values(FONT_ROLES)) {
    const b64 = FONT_DATA[role.key];
    if (b64) GlobalFonts.register(Buffer.from(b64, 'base64'), role.family);
  }
  fontsRegistered = true;
}

// ---- Selectable font library (Font Picker mode) ----------------------------
// 117 real Google Fonts a user can actually choose by name, instead of the
// 5 fixed roles above. Registered lazily, one at a time, the first time each
// is actually used — registering all 117 up front on every cold start would
// be wasted work for the ~99% of requests that only ever touch one of them.
// GlobalFonts is a process-wide registry that survives across warm Lambda
// invocations, so a Set tracks what's already been registered THIS instance
// to avoid re-registering (harmless but pointless) on every call.
const LIBRARY_BY_ID = new Map(FONT_LIBRARY.map((f) => [f.id, f]));
const registeredLibraryIds = new Set();
function ensureLibraryFont(fontId) {
  const meta = LIBRARY_BY_ID.get(fontId);
  if (!meta) return null; // unknown id -- caller falls back to a FONT_ROLES default
  if (!registeredLibraryIds.has(fontId)) {
    const b64 = LIBRARY_FONT_DATA[fontId];
    if (!b64) return null;
    GlobalFonts.register(Buffer.from(b64, 'base64'), meta.family);
    registeredLibraryIds.add(fontId);
  }
  return meta.family;
}

function hexToRgba(hex, alpha = 1) {
  const h = (hex || '#ffffff').replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Lighten (percent > 0) or darken (percent < 0) a hex color — used to
// auto-derive a gradient's second stop from just the one accent color the
// user already picked, so gradient text needs no extra color-picker UI.
function shadeColor(hex, percent) {
  const h = (hex || '#ffffff').replace('#', '');
  const r = parseInt(h.length === 3 ? h[0] + h[0] : h.slice(0, 2), 16);
  const g = parseInt(h.length === 3 ? h[1] + h[1] : h.slice(2, 4), 16);
  const b = parseInt(h.length === 3 ? h[2] + h[2] : h.slice(4, 6), 16);
  const adj = (c) => Math.max(0, Math.min(255, Math.round(percent >= 0 ? c + (255 - c) * percent : c * (1 + percent))));
  return `rgb(${adj(r)},${adj(g)},${adj(b)})`;
}

// Draw an image "cover"-fit into a w x h box (crop to fill, no distortion).
function drawCover(ctx, img, x, y, w, h) {
  const ir = img.width / img.height, br = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > br) { sw = img.height * br; sx = (img.width - sw) / 2; }
  else { sh = img.width / br; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// Center-crop an image buffer to an exact target aspect ratio (w/h). Needed
// because GPT Image 2 only has 3 fixed native output sizes (square, ~2:3
// portrait, ~3:2 landscape) — an aspect like 4:5 has no matching native size,
// so it silently came back as the closest one (2:3) instead, which visibly
// isn't what "4:5 portrait" means. This crops the real pixels down to the
// exact ratio the user actually picked, at full resolution (no distortion,
// no resampling of the kept region — only the excess strip is discarded).
async function cropToAspect(buf, targetRatio) {
  const img = await loadImage(buf);
  const ir = img.width / img.height;
  if (Math.abs(ir - targetRatio) < 0.01) return buf; // already matches, skip a needless re-encode
  let cw = img.width, ch = img.height;
  if (ir > targetRatio) cw = Math.round(img.height * targetRatio);
  else ch = Math.round(img.width / targetRatio);
  const sx = Math.round((img.width - cw) / 2), sy = Math.round((img.height - ch) / 2);
  const canvas = createCanvas(cw, ch);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, sx, sy, cw, ch, 0, 0, cw, ch);
  return canvas.toBuffer('image/png');
}

// Draws `img` onto `ctx` at (x,y), resized to exactly (w,h), through a
// radial-fade alpha mask instead of a hard rectangle — used to paste an
// edited crop back into the image it came from (Flyer Studio's "spot fix"
// tool) without a visible seam at the crop's edges. `destination-in`
// keeps only the drawn pixels where the mask is opaque, so the crop's
// outer ~35% fades to fully transparent before compositing onto the base.
function pasteFeathered(ctx, img, x, y, w, h) {
  const soft = createCanvas(w, h);
  const sctx = soft.getContext('2d');
  sctx.drawImage(img, 0, 0, w, h);
  sctx.globalCompositeOperation = 'destination-in';
  const cx = w / 2, cy = h / 2;
  const outerR = Math.max(w, h) / 2;
  const innerR = outerR * 0.65;
  const grad = sctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, w, h);
  ctx.drawImage(soft, x, y);
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

// Text/panel effects — real canvas shadow/glow, not gambled on the image
// model. `style` is the shared vocabulary every draw* function below
// understands: 'flat' (no effect), 'shadow' (soft dark drop shadow — the
// default; legibility over a busy hero photo), 'glow' (colored glow in the
// accent color), 'glass' (translucent panel behind the text — see
// drawGlassPanel), 'gradient' (headline-only — see drawHeadline; still
// gets the same soft shadow as 'shadow' underneath the gradient fill,
// since a gradient alone doesn't guarantee contrast against a busy photo).
function applyTextEffect(ctx, style, accentColor) {
  if (style === 'shadow' || style === 'gradient') { ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 16; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 5; }
  else if (style === 'glow') { ctx.shadowColor = accentColor || '#00e0c6'; ctx.shadowBlur = 26; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
  else { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }
}
function resetTextEffect(ctx) { ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; }

// Translucent rounded glass panel behind a text block — flat-compositable
// glassmorphism (dark tint + a white frost sheen + a faint border), not
// live background refraction (that needs sampling+blurring the exact
// pixels behind it, well beyond a sub-second synchronous composite step).
// The dark tint underneath is what keeps white text legible regardless of
// what's behind the panel (a bright sky, bokeh, anything) — pure white-
// tinted glass alone reads fine over dark image areas but loses contrast
// completely over light ones.
function drawGlassPanel(ctx, { x, y, w, h, radius = 20, tintAlpha = 0.32, fillAlpha = 0.10, borderAlpha = 0.28 }) {
  ctx.save(); resetTextEffect(ctx);
  ctx.fillStyle = hexToRgba('#0a0a12', tintAlpha);
  roundRect(ctx, x, y, w, h, radius); ctx.fill();
  ctx.fillStyle = hexToRgba('#ffffff', fillAlpha);
  roundRect(ctx, x, y, w, h, radius); ctx.fill();
  ctx.strokeStyle = hexToRgba('#ffffff', borderAlpha); ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, radius); ctx.stroke();
  ctx.restore();
}

// Thin, slightly-tilted accent-colored underline swipe beneath one word —
// the "hand-drawn underline swipe" micro-motif the anchor template calls
// for. x/y is the word's own baseline-left origin, width is its measured
// text width.
function drawUnderlineSwipe(ctx, { x, y, width, color, tilt = -2 }) {
  ctx.save(); resetTextEffect(ctx);
  ctx.translate(x + width / 2, y);
  ctx.rotate(tilt * Math.PI / 180);
  ctx.strokeStyle = color; ctx.lineWidth = Math.max(3, width * 0.025); ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-width / 2, 0); ctx.lineTo(width / 2, 0); ctx.stroke();
  ctx.restore();
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
// seen across the reference set). `style` ('flat'|'shadow'|'glow'|'glass'|
// 'gradient') and `underline` (draw the swipe motif under the accent word)
// are the same shared effect vocabulary every draw* function here
// understands. `style === 'gradient'` fills the accented word (or, with
// `gradientWhole`, every word) with a vertical gradient from accentColor to
// `gradientTo` (auto-derived — a darker shade of accentColor — when not
// given), matching the gradient-headline look seen in real reference
// flyers (e.g. a pink-to-maroon or orange-to-red headline fill).
function drawHeadline(ctx, { text, x, y, maxWidth, fontSize, accentColor, accentWord, scriptAccent, align = 'left', style = 'shadow', underline = false, gradientTo, gradientWhole = false, fontFamily, fontWeight }) {
  ensureFonts();
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  const family = fontFamily || FONT_ROLES.display.family;
  const weight = fontFamily ? (fontWeight || 400) : 900;
  ctx.font = `${weight} ${fontSize}px "${family}"`;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.05;
  const target = (accentWord || '').toLowerCase();

  if (style === 'glass') {
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    const pad = fontSize * 0.35;
    const panelX = align === 'center' ? x - widest / 2 - pad : align === 'right' ? x - widest - pad : x - pad;
    drawGlassPanel(ctx, { x: panelX, y: y - fontSize * 0.85 - pad, w: widest + pad * 2, h: lines.length * lineHeight + pad * 1.3, radius: fontSize * 0.3 });
  }
  applyTextEffect(ctx, style, accentColor);
  let gradientFill = null;
  if (style === 'gradient') {
    gradientFill = ctx.createLinearGradient(x, y - fontSize * 0.9, x, y + lines.length * lineHeight);
    gradientFill.addColorStop(0, accentColor || '#00e0c6');
    gradientFill.addColorStop(1, gradientTo || shadeColor(accentColor || '#00e0c6', -0.4));
  }

  lines.forEach((line, i) => {
    const ly = y + i * lineHeight;
    const words = line.split(' ');
    const isLastLine = i === lines.length - 1;
    let matchIdx = target ? words.findIndex((w) => w.toLowerCase().replace(/[^a-z0-9]/g, '') === target) : -1;
    if (matchIdx === -1 && !target && isLastLine) matchIdx = words.length - 1;
    if (matchIdx === -1 && !gradientFill) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, x, ly);
      return;
    }
    if (matchIdx === -1 && gradientFill && !gradientWhole) {
      ctx.fillStyle = '#ffffff';
      ctx.fillText(line, x, ly);
      return;
    }
    // Draw word-by-word so only the matched word (or, with gradientWhole,
    // every word) gets the accent/gradient treatment.
    let cursorX = x;
    const widths = words.map((w) => ctx.measureText(w + ' ').width);
    const total = widths.reduce((a, b) => a + b, 0) - ctx.measureText(' ').width;
    if (align === 'center') cursorX = x - total / 2;
    else if (align === 'right') cursorX = x - total;
    const prevAlign = ctx.textAlign; ctx.textAlign = 'left';
    words.forEach((w, wi) => {
      const accented = wi === matchIdx || (gradientFill && gradientWhole);
      if (accented && scriptAccent && wi === matchIdx) {
        ctx.font = `${fontSize * 0.9}px "${FONT_ROLES.script.family}"`;
        ctx.fillStyle = gradientFill || accentColor;
        ctx.fillText(w, cursorX, ly + fontSize * 0.05);
        ctx.font = `${weight} ${fontSize}px "${family}"`;
      } else if (accented) {
        ctx.fillStyle = gradientFill || accentColor;
        ctx.fillText(w, cursorX, ly);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillText(w, cursorX, ly);
      }
      if (wi === matchIdx && underline) {
        drawUnderlineSwipe(ctx, { x: cursorX, y: ly + fontSize * 0.16, width: widths[wi] - ctx.measureText(' ').width, color: accentColor });
      }
      cursorX += widths[wi];
    });
    ctx.textAlign = prevAlign;
  });
  resetTextEffect(ctx);
  return lines.length * lineHeight;
}

function drawSubhead(ctx, { text, x, y, maxWidth, fontSize = 28, color = '#ffffff', align = 'left', style = 'shadow', fontFamily }) {
  ensureFonts();
  ctx.font = `${fontSize}px "${fontFamily || FONT_ROLES.body.family}"`;
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  applyTextEffect(ctx, style === 'glow' ? 'shadow' : style, color); // a full glow on body copy reads noisy — falls back to a plain shadow
  const lines = wrapText(ctx, text, maxWidth);
  const lh = fontSize * 1.3;
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
  resetTextEffect(ctx);
  return lines.length * lh;
}

// Info card: rounded panel with bulleted lines, one small accent-colored
// marker per bullet — per anchor template layer 5. `style === 'glass'`
// switches the panel to the translucent glassmorphic treatment.
function drawInfoCard(ctx, { x, y, w, bullets, accentColor, style = 'flat', fontSize = 22, fontFamily }) {
  ensureFonts();
  const glass = style === 'glass';
  const pad = 24, gap = fontSize * 1.5;
  const h = pad * 2 + bullets.length * gap;
  if (glass) drawGlassPanel(ctx, { x, y, w, h, radius: 18 });
  else { ctx.fillStyle = hexToRgba('#0a0a0a', 0.55); roundRect(ctx, x, y, w, h, 18); ctx.fill(); }
  ctx.font = `${fontSize}px "${fontFamily || FONT_ROLES.body.family}"`;
  ctx.textBaseline = 'middle';
  applyTextEffect(ctx, style === 'glass' ? 'flat' : style, accentColor);
  bullets.forEach((b, i) => {
    const by = y + pad + gap * i + fontSize * 0.5;
    ctx.fillStyle = accentColor;
    ctx.beginPath(); ctx.arc(x + pad + 6, by, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText(b, x + pad + 24, by);
  });
  resetTextEffect(ctx);
  return h;
}

// Small pill/chip badge (price, date, "NEW" seal) — layer 6 micro-motif.
function drawBadge(ctx, { text, x, y, accentColor, fontSize = 18, style = 'flat' }) {
  ensureFonts();
  ctx.font = `700 ${fontSize}px "${FONT_ROLES.bodyBold.family}"`;
  const padX = 18, padY = 10;
  const tw = ctx.measureText(text).width;
  const w = tw + padX * 2, h = fontSize + padY * 2;
  if (style === 'shadow' || style === 'glow') applyTextEffect(ctx, style, accentColor);
  ctx.fillStyle = accentColor;
  roundRect(ctx, x, y, w, h, h / 2); ctx.fill();
  resetTextEffect(ctx);
  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x + padX, y + h / 2 + 1);
  return { w, h };
}

// CTA banner for finished VIDEOS — "comment a word" / "tap below" style,
// ad-ready for IG/TikTok. Draws a bold pill button on a translucent bar so
// it reads instantly with sound off. Meant to be rendered on its own
// transparent canvas (same size as the video) and composited via ffmpeg's
// overlay filter — see _ffmpeg.js's overlayImageOnVideo.
function drawCtaBanner(ctx, { text, width, height, y, accentColor, position = 'bottom' }) {
  ensureFonts();
  const barH = Math.round(height * 0.14);
  const barY = position === 'top' ? y : y - barH;
  ctx.fillStyle = hexToRgba('#000000', 0.55);
  ctx.fillRect(0, barY, width, barH);
  ctx.fillStyle = accentColor;
  ctx.fillRect(0, position === 'top' ? barY + barH - 3 : barY, width, 3);

  const fontSize = Math.round(width * 0.048);
  ctx.font = `900 ${fontSize}px "${FONT_ROLES.display.family}"`;
  const padX = fontSize * 0.9, padY = fontSize * 0.55;
  const tw = ctx.measureText(text).width;
  const pillW = Math.min(width * 0.9, tw + padX * 2), pillH = fontSize + padY * 2;
  const pillX = (width - pillW) / 2, pillY = barY + (barH - pillH) / 2;
  ctx.fillStyle = accentColor;
  roundRect(ctx, pillX, pillY, pillW, pillH, pillH / 2); ctx.fill();
  ctx.fillStyle = '#0a0a0a';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, pillY + pillH / 2 + fontSize * 0.03);
  return barH;
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
  drawCover, wrapText, roundRect, drawHeadline, drawSubhead, drawInfoCard, drawBadge, drawFooterBar, drawCtaBanner, hexToRgba, cropToAspect,
  drawGlassPanel, drawUnderlineSwipe, applyTextEffect, resetTextEffect, pasteFeathered,
  FONT_LIBRARY, ensureLibraryFont,
};
