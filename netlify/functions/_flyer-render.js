// ============================================================
// Flyer Studio — SPEC RENDERER. Turns a validated layer graph (see
// _flyer-spec.js) into pixels, or into the geometry the browser editor
// needs to draw the same thing.
//
// One renderer, two consumers, deliberately:
//   layoutSpec()  — pure geometry, no canvas. The browser uses this to place
//                   Fabric objects, so the editor preview and the exported
//                   PNG agree by construction rather than by two people
//                   maintaining the same maths in two files.
//   renderSpec()  — draws with @napi-rs/canvas for export and for the
//                   server-side preview.
//
// Percentages in, pixels out. Every x/y/w/h on a layer is a percent of canvas
// width/height, so the same spec renders at any size.
// ============================================================
const { createCanvas, loadImage, ensureLibraryFont } = require('./_canvas');
const { canvasFor } = require('./_flyer-spec');

/**
 * Resolve a spec into absolute pixel boxes. Returns one entry per layer, in
 * paint order, with everything the drawing step needs already computed.
 */
function layoutSpec(spec, scale = 1) {
  const base = spec.canvas || canvasFor(spec.aspect);
  const W = Math.round(base.w * scale);
  const H = Math.round(base.h * scale);
  const fontsByRole = new Map((spec.fonts || []).map((f) => [f.role, f]));

  const items = (spec.layers || []).map((layer) => {
    const box = {
      x: (layer.x / 100) * W,
      y: (layer.y / 100) * H,
      w: (layer.w / 100) * W,
      h: layer.h != null ? (layer.h / 100) * H : null,
    };
    const out = { layer, box };

    if (layer.type === 'text') {
      const font = fontsByRole.get(layer.font) || (spec.fonts || [])[0] || { fontId: 'anton', tracking: -0.02, leading: 0.95, case: 'upper' };
      // capHeightPct is a percent of canvas HEIGHT, which is what makes type
      // scale with the poster rather than with its own column width. Cap
      // height is roughly 0.72 of em for the display faces in the library, so
      // the em size is derived from it rather than being specified directly —
      // that way "9% tall caps" means the same thing across families.
      const capPx = (layer.capHeightPct / 100) * H;
      const fontPx = capPx / 0.72;
      const lines = String(layer.text || '').split('\n');
      out.text = {
        font, fontPx,
        lineHeight: fontPx * (font.leading != null ? font.leading : 0.95),
        tracking: (font.tracking != null ? font.tracking : -0.02) * fontPx,
        lines: font.case === 'upper' ? lines.map((l) => l.toUpperCase())
             : font.case === 'lower' ? lines.map((l) => l.toLowerCase())
             : lines,
      };
      out.box.h = out.text.lineHeight * out.text.lines.length;
    }
    return out;
  });

  return { W, H, items };
}

// Display faces are drawn for headlines, not for coverage — most of the
// library has no ₦, and several lack € or ₹ too. Canvas does not fall back on
// its own here: a missing glyph draws as .notdef, an empty box. On a Nigerian
// price ("₦4,500") that is a silent, shipping-breaking bug, so every glyph is
// checked and anything the chosen face can't draw is rendered in a broad body
// font at the same size instead.
const GLYPH_FALLBACK = 'inter';

// ...except ₦, which is not in ANY of the 117 bundled faces — checked all of
// them. For a product whose users price in naira that is not a footnote, it
// is every price on every flyer rendering as an empty box. Falling back to
// another font can't help when no font has it, so it's drawn: the face's own
// "N" with two bars struck through it, which is what the glyph is. Built from
// the current font means it matches the headline weight and width instead of
// looking pasted in from somewhere else.
const NAIRA = '₦';
function drawNaira(ctx, x, y, fontPx, fillStyle) {
  const w = ctx.measureText('N').width;
  ctx.fillText('N', x, y);
  // Bars sit inside the cap, clear of the baseline and the cap line, and
  // overhang the stem slightly on both sides the way the real glyph does.
  const capTop = y - fontPx * 0.72;
  const bar = Math.max(1, fontPx * 0.075);
  const overhang = w * 0.09;
  ctx.save();
  ctx.fillStyle = fillStyle;
  [0.40, 0.63].forEach((t) => {
    ctx.fillRect(x - overhang, capTop + fontPx * 0.72 * t - bar / 2, w + overhang * 2, bar);
  });
  ctx.restore();
  return w;
}

/** True when `family` has no glyph for `ch`. Detected by comparing against the
 *  width the face reports for a guaranteed-absent codepoint — every .notdef in
 *  a given font measures the same, so an exact match means "not in this font".
 *  Cached per family+size because measureText is the hot path in a headline. */
function makeGlyphChecker(ctx, family, weight, px) {
  const spec = `${weight} ${px}px "${family}"`;
  ctx.font = spec;
  const notdef = ctx.measureText('￿').width;
  const cache = new Map();
  return function has(ch) {
    if (cache.has(ch)) return cache.get(ch);
    ctx.font = spec;
    const w = ctx.measureText(ch).width;
    // A zero-width result means nothing was drawn either. Space is exempt —
    // it legitimately measures narrow and is present in every face.
    const ok = ch === ' ' || (w > 0 && Math.abs(w - notdef) > 0.01);
    cache.set(ch, ok);
    return ok;
  };
}

/** Draw one text layer. Letter-spacing is applied per glyph because canvas
 *  has no reliable cross-platform letterSpacing, and tight tracking is a
 *  load-bearing part of the look — not a detail worth losing. */
function drawTextLayer(ctx, item, W) {
  const { layer, box, text } = item;
  const family = ensureLibraryFont(text.font.fontId) || 'sans-serif';
  const fallbackFamily = ensureLibraryFont(GLYPH_FALLBACK) || 'sans-serif';
  const weight = fontWeightFor(text.font);
  const primary = `${weight} ${text.fontPx}px "${family}"`;
  const fallback = `${weight} ${text.fontPx}px "${fallbackFamily}"`;
  const has = makeGlyphChecker(ctx, family, weight, text.fontPx);

  ctx.save();
  ctx.fillStyle = layer.hex || '#FFFFFF';
  ctx.font = primary;
  ctx.textBaseline = 'alphabetic';

  if (layer.rotate) {
    ctx.translate(box.x, box.y);
    ctx.rotate((layer.rotate * Math.PI) / 180);
    ctx.translate(-box.x, -box.y);
  }

  text.lines.forEach((line, i) => {
    const y = box.y + text.lineHeight * (i + 0.8);
    const width = measureTracked(ctx, line, text.tracking, has, primary, fallback);
    let x = box.x;
    if (layer.align === 'center') x = box.x + (box.w - width) / 2;
    else if (layer.align === 'right') x = box.x + box.w - width;
    for (const ch of line) {
      if (ch === NAIRA) {
        ctx.font = primary;
        x += drawNaira(ctx, x, y, text.fontPx, layer.hex || '#FFFFFF') + text.tracking;
        continue;
      }
      ctx.font = has(ch) ? primary : fallback;
      ctx.fillText(ch, x, y);
      x += ctx.measureText(ch).width + text.tracking;
    }
  });
  ctx.restore();
}

function measureTracked(ctx, line, tracking, has, primary, fallback) {
  let w = 0;
  for (const ch of line) {
    ctx.font = ch === NAIRA ? primary : (has(ch) ? primary : fallback);
    w += ctx.measureText(ch === NAIRA ? 'N' : ch).width + tracking;
  }
  return w - tracking;
}
function fontWeightFor(font) { return font.weight || 400; }

/** Flat colour rectangle, optionally rounded. */
function drawFillLayer(ctx, item, W) {
  const { layer, box } = item;
  ctx.save();
  ctx.fillStyle = layer.hex || '#000000';
  const r = layer.radius ? (layer.radius / 100) * W : 0;
  if (r > 0) {
    ctx.beginPath();
    ctx.moveTo(box.x + r, box.y);
    ctx.arcTo(box.x + box.w, box.y, box.x + box.w, box.y + box.h, r);
    ctx.arcTo(box.x + box.w, box.y + box.h, box.x, box.y + box.h, r);
    ctx.arcTo(box.x, box.y + box.h, box.x, box.y, r);
    ctx.arcTo(box.x, box.y, box.x + box.w, box.y, r);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(box.x, box.y, box.w, box.h);
  }
  ctx.restore();
}

/** Image layer, contained inside its box so a generated asset with a
 *  different aspect than the spec asked for is letterboxed rather than
 *  stretched — a squashed product is far more obvious than a small gap. */
async function drawImageLayer(ctx, item, url) {
  if (!url) return;
  let img; try { img = await loadImage(url); } catch (e) { return; }
  const { box } = item;
  const s = Math.min(box.w / img.width, box.h / img.height);
  const w = img.width * s, h = img.height * s;
  ctx.drawImage(img, box.x + (box.w - w) / 2, box.y + (box.h - h) / 2, w, h);
}

/**
 * Paper grain. Deterministic per canvas size, applied over EVERYTHING
 * including type — that "over the type too" part is what stops a poster
 * reading as a digital composite, and it's the cheapest single win in the
 * whole de-AI list.
 */
function applyGrain(ctx, W, H, pct) {
  if (!pct) return;
  const amount = (pct / 100) * 255;
  const img = ctx.getImageData(0, 0, W, H);
  const d = img.data;
  // Deterministic LCG rather than Math.random so the same spec exports the
  // same file twice — otherwise "regenerate one layer" changes every pixel.
  let seed = (W * 73856093) ^ (H * 19349663);
  for (let i = 0; i < d.length; i += 4) {
    seed = (seed * 1664525 + 1013904223) & 0x7fffffff;
    const n = ((seed >> 16) / 32768 - 0.5) * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Full render. layerImages maps layer id -> image URL (generated separately,
 * cached on the project) so this never generates anything itself.
 */
async function renderSpec(spec, layerImages = {}, opts = {}) {
  const scale = opts.scale || 1;
  const { W, H, items } = layoutSpec(spec, scale);
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // Opaque ground first — a spec whose base layer doesn't cover the canvas
  // would otherwise export with transparent edges.
  ctx.fillStyle = (spec.palette && spec.palette[0] && spec.palette[0].hex) || '#000000';
  ctx.fillRect(0, 0, W, H);

  for (const item of items) {
    if (item.layer.hidden) continue;
    if (item.layer.type === 'fill') drawFillLayer(ctx, item, W);
    else if (item.layer.type === 'image') await drawImageLayer(ctx, item, layerImages[item.layer.id]);
    else if (item.layer.type === 'text') drawTextLayer(ctx, item, W);
  }

  applyGrain(ctx, W, H, spec.grainPct);
  return canvas;
}

module.exports = { layoutSpec, renderSpec, applyGrain };
