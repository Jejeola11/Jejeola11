// ============================================================
// Flyer Studio — THE LOCKED SPEC ENGINE (shared brain, no network calls).
//
// WHY THIS EXISTS
// The old pipeline asked an LLM for a prose image prompt, generated a flat
// picture, then composited a fixed 7-layer text template on top. Two things
// were wrong with that:
//   1. Prose prompts drift. "Bold modern poster, vibrant colors" gives the
//      model room to reach for its defaults — soft gradients, glow, bokeh,
//      centred symmetry — which is exactly the look people recognise as AI.
//   2. A flat picture has no parts. You can't tap the title and change it,
//      you can't regenerate just the product, because there is nothing there
//      but pixels.
//
// This module fixes both by making the DESIGN ITSELF DATA. An art-director
// spec (see buildSpecBrainPrompt) is turned into a LAYER GRAPH: flat colour
// panels with exact hex, image layers with their own prompts, and text layers
// carrying real strings, fonts and colours. From that one structure we get:
//   - the de-AI look, because flat fills and type are DRAWN, never generated
//   - correct spelling, because text is rendered as text and never guessed
//   - a real layers panel, because every element is already a discrete object
//
// The method is adapted from the "locked spec" approach: a LOCKED block the
// user never edits (format, grid, type, palette) and an editable block (the
// subject and the strings). Rule of thumb from that source, worth keeping:
// the LOCKED block is the designer, the editable block is the client, and the
// client never touches the grid.
//
// Coordinates are PERCENTAGES of canvas width/height, never pixels, so one
// spec renders identically at preview size and at 2400x3200 export.
// ============================================================

const { FONT_LIBRARY } = require('./_flyer-fonts-library');

// The spec may only name fonts we can actually render. A family the compositor
// doesn't have silently falls back to the default face, which quietly wrecks
// the design — the layout is still "correct" but the type is not the type that
// was specified. So the model picks IDs from this library, and validateSpec()
// snaps anything unrecognised back into it.
const FONT_IDS = new Set(FONT_LIBRARY.map((f) => f.id));
const FONTS_BY_CATEGORY = FONT_LIBRARY.reduce((acc, f) => {
  (acc[f.category] = acc[f.category] || []).push(f.id);
  return acc;
}, {});

// ---- Canvas sizes per aspect. Long edge 3200 keeps GPT Image 2 output and
// the export canvas on the same grid, so nothing is resampled twice.
const CANVAS = {
  '4:5':  { w: 2560, h: 3200 },
  '3:4':  { w: 2400, h: 3200 },
  '1:1':  { w: 3000, h: 3000 },
  '9:16': { w: 1800, h: 3200 },
  '16:9': { w: 3200, h: 1800 },
};
function canvasFor(aspect) { return CANVAS[aspect] || CANVAS['4:5']; }

// ---- The anti-"AI look" list. This is the single highest-leverage part of
// the whole engine: every item is a default the image model reaches for on
// its own, and each one is a tell that a human designer would never produce.
// Applied to EVERY image-layer prompt, on top of whatever the layer says.
const HARD_NEGATIVES = [
  'no gradient, glow, bloom, vignette or falloff',
  'no lens flare, bokeh, depth-of-field or motion blur',
  'no drop shadows, no soft ambient occlusion between elements',
  'no photographic sky, no stock-photo environment, no incidental people',
  'no watermark, signature, logo, QR code, URL or credit line',
  'no baseplates, studs, mockup frames, device frames or paper curl',
  'no smooth plastic sheen where a matte material is specified',
  'no extra text of any kind — this layer carries NO words, letters or numerals',
  'no serif, script, italic or outline type',
  'no colours outside the named palette',
];

// Print physics — the other half of not looking generated. Real posters are
// printed, so they carry ink and paper behaviour the model omits by default.
const PRINT_PHYSICS = [
  'fine uncoated-paper grain at 6-10% covering 100% of the canvas, type included',
  'flat ink fills with visible tonal banding rather than photographic gradation',
  'hard edges everywhere — every shape cut clean, never feathered',
];

/**
 * The rules the spec-writing model must follow. This is prose because it goes
 * into an LLM prompt; everything it produces, though, comes back as JSON.
 */
function buildSpecBrainPrompt() {
  return `YOU ARE WRITING A LOCKED DESIGN SPEC, NOT A PICTURE DESCRIPTION.

You do not describe a mood and hope. You specify a poster the way an art director hands one to a studio: exact grid, exact hex, exact type sizes, exact strings. Everything you leave vague, the image model fills with its defaults — and its defaults are what make a design look AI-made.

THE LOCKED / EDITABLE SPLIT
- LOCKED (you decide, the user does not touch): format, grid, type families and weights, palette.
- EDITABLE (the user's content): the subject of image layers, and the words in text layers.
Never let the content dictate the grid. A weak brief still gets a strong grid.

GRID
- Build on a MODULAR RECTANGULAR GRID of hard-edged panels butted together, or a single full-bleed field with type pushed to the edges. Pick one and commit.
- Panels are DELIBERATELY UNEVEN — never equal thirds, never a symmetrical 2x2. Uneven is the single clearest signal of a human layout.
- Leave one area genuinely empty. Emptiness is the loudest element on a well-made poster; AI output is uniformly busy.

TYPE
- TWO type families maximum, three only for a bilingual poster. Name a real family and a real weight.
- Give every text layer a cap height as a PERCENT OF CANVAS HEIGHT, and set tracking and leading explicitly.
- Headlines are tracked TIGHT — letters nearly touching. Loose default tracking reads as a template.
- One deliberate exception in the hierarchy (a single hairline title among heavy ones, one rotated label) does more for the design than five effects.

PALETTE
- SIX COLOURS MAXIMUM, each an exact hex, each named. State that nothing outside the palette may appear.
- Flat fills only. A gradient in a panel is the fastest way to look generated.

STRINGS
- Every word that appears on the poster must be written out exactly as it should read, with its line breaks, spelling and punctuation.
- No extra words. No URLs, QR codes, sponsor rows, ratings or platform icons unless the user actually asked for them.

IMAGE LAYERS
- Each image layer gets its own self-contained prompt describing ONE subject, cut out clean, with no text and no environment unless the environment IS the layer.
- Say what the thing is made of and how it is lit. "Matte plastic, soft key from upper left, cool fill lower right" beats "high quality render" every time.
- Original artwork only — never a real brand, franchise, celebrity or existing character.`;
}

/**
 * The JSON contract. Kept separate from the prose above so the schema can be
 * tightened without rewriting the design teaching, and vice versa.
 */
function buildSpecSchemaPrompt() {
  return `OUTPUT — a single JSON object, no prose around it, no markdown fence.

{
  "name": "short project name",
  "aspect": "4:5" | "3:4" | "1:1" | "9:16" | "16:9",
  "grainPct": 8,
  "palette": [{ "name": "deep violet", "hex": "#3B1E9E" }],
  "fonts": [{ "role": "display", "fontId": "anton", "case": "upper", "tracking": -0.03, "leading": 0.9 }],
  "layers": [ ... bottom of the stack first, top last ... ]
}

FONTS — "fontId" MUST be one of these exact ids. Anything else cannot be rendered:
${Object.entries(FONTS_BY_CATEGORY).map(([cat, ids]) => `${cat}: ${ids.join(', ')}`).join('\n')}
Give each font a "role" you invent ("display", "label", "data") and reference that role from text layers.

LAYER TYPES — every layer needs id, type, name, and x/y/w as PERCENTAGES of canvas width/height (0-100). "name" is what the user sees in the layers panel, so make it human: "Title", "Price tag", "Product", not "layer_3".

{ "id": "base", "type": "fill", "name": "Base", "hex": "#0A0A0A", "x": 0, "y": 0, "w": 100, "h": 100 }
  A flat colour rectangle. Panels, bars, tags, rules — all of these. Optional "radius" (percent of width) for a rounded chip.

{ "id": "hero", "type": "image", "name": "Product", "prompt": "self-contained prompt for THIS subject only", "x": 8, "y": 30, "w": 84, "h": 45, "cutout": true }
  Generated by the image model. "cutout": true means transparent background — use it for any object sitting on a panel. Use false only for a full-bleed photographic field.

{ "id": "title", "type": "text", "name": "Title", "text": "MONSTER\\nSTACK", "font": "display", "hex": "#F5F5F0", "capHeightPct": 9, "x": 8, "y": 62, "w": 84, "align": "left", "rotate": 0 }
  Real rendered text. "text" carries exact line breaks with \\n. "font" references a role from the fonts array. No "h" — height follows from capHeightPct and the line count.

RULES
- Bottom-up order. The base fill is the first layer, the topmost detail is the last.
- Between 6 and 16 layers. Fewer than 6 is a template; more than 16 stops being editable.
- Every hex used by any layer must appear in the palette.
- Every text layer's "font" must match a role in the fonts array.
- Layers must not all be the same size or evenly spaced — see the grid rules above.
- Pick "aspect" from the user's stated use if they gave one; default "4:5" for social, "3:4" for print.`;
}

/**
 * Assembles the full prompt for one image layer: the layer's own subject,
 * plus the palette it must stay inside, plus the physics and the negatives.
 * Every image layer in a design goes through here, so the de-AI rules can
 * never be forgotten on an individual layer.
 */
function buildLayerImagePrompt(layer, spec) {
  const palette = (spec.palette || []).map((p) => `${p.name} ${p.hex}`).join(', ');
  const bg = layer.cutout
    ? 'Cut out clean on a fully transparent background — no backdrop, no ground plane, no cast shadow, no surface under the subject.'
    : 'Full-bleed field, edge to edge, no border and no margin.';
  return [
    `${layer.prompt}`,
    '',
    `FORMAT: ${bg} Original artwork only — no existing brand, franchise, character or real person.`,
    palette ? `PALETTE: stay inside these colours only — ${palette}.` : '',
    `PRINT: ${PRINT_PHYSICS.join('; ')}.`,
    `HARD NEGATIVES: ${HARD_NEGATIVES.join('; ')}.`,
  ].filter(Boolean).join('\n');
}

/**
 * Structural validation. The model is good but not reliable, and a spec with
 * a text layer pointing at a missing font role, or a hex that isn't in the
 * palette, renders as a silent visual bug rather than an error. Returns a
 * repaired spec plus the list of what was wrong, so callers can log drift
 * instead of shipping it invisibly.
 */
function validateSpec(raw) {
  const problems = [];
  const spec = Object.assign({}, raw);

  spec.aspect = CANVAS[spec.aspect] ? spec.aspect : '4:5';
  const { w, h } = canvasFor(spec.aspect);
  spec.canvas = { w, h };
  spec.grainPct = clamp(num(spec.grainPct, 8), 0, 20);
  spec.palette = Array.isArray(spec.palette) ? spec.palette.filter((p) => p && HEX.test(p.hex || '')) : [];
  spec.fonts = (Array.isArray(spec.fonts) && spec.fonts.length ? spec.fonts : [{ role: 'display', fontId: 'anton' }])
    .map((f, i) => {
      const font = Object.assign({ case: 'upper', tracking: -0.02, leading: 0.95 }, f);
      if (!font.role) font.role = i === 0 ? 'display' : `font-${i + 1}`;
      if (!FONT_IDS.has(font.fontId)) {
        problems.push(`font "${font.role}": ${font.fontId || '(none)'} is not in the library`);
        font.fontId = i === 0 ? 'anton' : 'inter';
      }
      font.tracking = clamp(num(font.tracking, -0.02), -0.15, 0.6);
      font.leading = clamp(num(font.leading, 0.95), 0.7, 2);
      return font;
    });

  const paletteHexes = new Set(spec.palette.map((p) => p.hex.toUpperCase()));
  const fontRoles = new Set(spec.fonts.map((f) => f.role));
  const seenIds = new Set();

  spec.layers = (Array.isArray(spec.layers) ? spec.layers : []).map((l, i) => {
    const layer = Object.assign({}, l);
    if (!layer.id || seenIds.has(layer.id)) { layer.id = `layer-${i + 1}`; problems.push(`layer ${i + 1}: missing or duplicate id`); }
    seenIds.add(layer.id);
    if (!['fill', 'image', 'text'].includes(layer.type)) { layer.type = 'fill'; problems.push(`layer ${layer.id}: unknown type`); }
    if (!layer.name) layer.name = layer.type === 'text' ? 'Text' : layer.type === 'image' ? 'Image' : 'Panel';

    layer.x = clamp(num(layer.x, 0), -20, 120);
    layer.y = clamp(num(layer.y, 0), -20, 120);
    layer.w = clamp(num(layer.w, 100), 1, 140);
    if (layer.type !== 'text') layer.h = clamp(num(layer.h, 100), 1, 140);

    if (layer.type === 'text') {
      layer.text = String(layer.text == null ? '' : layer.text);
      if (!fontRoles.has(layer.font)) { layer.font = spec.fonts[0].role; problems.push(`layer ${layer.id}: font role not defined`); }
      layer.capHeightPct = clamp(num(layer.capHeightPct, 4), 0.4, 30);
      layer.align = ['left', 'center', 'right'].includes(layer.align) ? layer.align : 'left';
      layer.rotate = clamp(num(layer.rotate, 0), -180, 180);
    }
    if (layer.type === 'image') {
      layer.cutout = layer.cutout !== false;
      if (!layer.prompt) problems.push(`layer ${layer.id}: image layer has no prompt`);
      // refIndex is 1-based in the prompt (it's how the user sees their
      // attachments) and stays 1-based here; the generation call resolves it
      // against the project's reference list. Anything non-numeric is dropped
      // rather than guessed — attaching the WRONG reference to a layer is a
      // worse failure than attaching none.
      if (layer.refIndex != null) {
        const idx = Math.round(num(layer.refIndex, 0));
        if (idx >= 1) layer.refIndex = idx;
        else { delete layer.refIndex; problems.push(`layer ${layer.id}: bad refIndex`); }
      }
    } else {
      delete layer.refIndex;
    }
    if (layer.hex && !HEX.test(layer.hex)) { problems.push(`layer ${layer.id}: bad hex ${layer.hex}`); delete layer.hex; }
    // A colour that isn't in the palette is the most common drift and the one
    // that visibly breaks the design, so it's pulled back to the nearest
    // palette entry rather than dropped (dropping would render it invisible).
    if (layer.hex && paletteHexes.size && !paletteHexes.has(layer.hex.toUpperCase())) {
      problems.push(`layer ${layer.id}: ${layer.hex} is outside the palette`);
      layer.hex = nearestHex(layer.hex, spec.palette);
    }
    return layer;
  });

  if (!spec.layers.length) problems.push('spec has no layers');
  return { spec, problems };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
function num(v, d) { const n = Number(v); return Number.isFinite(n) ? n : d; }
function clamp(n, lo, hi) { return Math.min(hi, Math.max(lo, n)); }
function rgb(hex) { return [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16)); }
function nearestHex(hex, palette) {
  const [r, g, b] = rgb(hex);
  let best = palette[0].hex, bestD = Infinity;
  palette.forEach((p) => {
    const [r2, g2, b2] = rgb(p.hex);
    const d = (r - r2) ** 2 + (g - g2) ** 2 + (b - b2) ** 2;
    if (d < bestD) { bestD = d; best = p.hex; }
  });
  return best;
}

module.exports = {
  CANVAS, canvasFor, HARD_NEGATIVES, PRINT_PHYSICS,
  buildSpecBrainPrompt, buildSpecSchemaPrompt, buildLayerImagePrompt, validateSpec,
};
