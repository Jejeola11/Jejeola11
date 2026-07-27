// ============================================================
// POST /.netlify/functions/flyer-composite-fonts   (Flyer Studio — "Pick your own font")
// Body: { project_id, text_spec, font_id }
//   Same text_spec shape as flyer-composite.js (headline, accent_word,
//   subhead, bullets, callouts, badge, footer, accent_color, style,
//   underline_accent, gradient_whole).
//   font_id: one of FONT_LIBRARY's ids (see _flyer-fonts-library.js) — the
//   real, selectable Google Font the headline/subhead/bullets render in.
//
// WHY THIS EXISTS: flyer-composite.js asks the image model (GPT Image 2 /
// nano-banana) to draw the typography itself, per an earlier direct
// request — which looks great but means there is no real font to choose;
// the model just approximates "a bold display typeface" every time, which
// is why every flyer converged on a similar-looking face regardless of
// what anyone asked for. This endpoint is the alternative: it composites
// the SAME text_spec with _canvas.js's real font-rendering engine (the one
// already built for CTA/footer overlays) against the project's existing
// hero_image_url, so the exact font picked is the exact font rendered —
// no AI interpretation in between.
//
// Synchronous, not a queued job — a local canvas render finishes in well
// under a second, so unlike flyer-composite.js there is no request_id /
// polling dance here. It also costs no credits: there is no external AI
// call to pay for, so charging the same as the AI-drawn mode would be
// billing for inference that never happened. (If that should change,
// this is the one line to edit — see `cost` below.)
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const {
  createCanvas, loadImage, drawHeadline, drawSubhead, drawInfoCard, drawBadge,
  drawFooterBar, cropToAspect, ensureLibraryFont, FONT_LIBRARY, FONT_ROLES, wrapText,
} = require('./_canvas');

// Real wrapped line count at the font/size that will actually be drawn —
// NOT a character-count guess. A guess is what caused the first version of
// this layout to overlap the headline's second line into the info card
// below it: character-count math has no idea how wide "W" vs "i" actually
// render, so its line-count estimate silently drifted from what
// drawHeadline/drawSubhead were really about to wrap to.
function countWrappedLines(ctx, text, maxWidth, weight, fontSize, family) {
  ctx.save();
  ctx.font = `${weight} ${fontSize}px "${family}"`;
  const n = wrapText(ctx, text, maxWidth).length;
  ctx.restore();
  return Math.max(1, n);
}

const cost = 0; // pure local render, no AI inference call to pay for

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  const spec = (body.text_spec && typeof body.text_spec === 'object') ? body.text_spec : {};
  const fontId = (body.font_id || '').trim();
  if (!projectId) return json(400, { error: 'Missing project_id' });
  if (!spec.headline) return json(400, { error: 'Add a headline first.' });

  const db = admin();
  const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found — generate a new hero visual to start fresh, then try compositing again.' });
  if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

  try {
    const family = (fontId && ensureLibraryFont(fontId)) || FONT_ROLES.display.family;

    const heroRes = await fetch(project.hero_image_url);
    if (!heroRes.ok) throw new Error('Could not load the hero visual — try regenerating it.');
    const heroBuf = Buffer.from(await heroRes.arrayBuffer());
    const img = await loadImage(heroBuf);

    const W = img.width, H = img.height;
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);

    const accent = spec.accent_color || '#00e0c6';
    const style = spec.style || 'shadow';
    const marginX = Math.round(W * 0.07);
    const maxWidth = W - marginX * 2;

    // Badge — top-right seal (price/date/"NEW"), drawn first so nothing
    // else overlaps it. drawBadge doesn't self-position (it's a left/top-
    // anchored primitive), so its width is measured here first, using the
    // exact same font/padding math it uses internally, and drawn ONCE at
    // the real spot — no throwaway draw-then-clear pass (that approach
    // previously left a visible stray badge behind at (0,0) because the
    // "clear" cleared the wrong rectangle).
    if (spec.badge) {
      const fontSize = Math.round(W * 0.028);
      ctx.save();
      ctx.font = `700 ${fontSize}px "${FONT_ROLES.bodyBold.family}"`;
      const tw = ctx.measureText(spec.badge).width;
      ctx.restore();
      const badgeW = tw + 18 * 2;
      drawBadge(ctx, { text: spec.badge, x: W - badgeW - marginX, y: marginX, accentColor: accent, fontSize, style: style === 'flat' ? 'flat' : 'shadow' });
    }

    // Footer strip — reserved at the very bottom edge first so the
    // headline stack above knows how much room it actually has.
    let footerH = 0;
    if (spec.footer) {
      footerH = Math.round(H * 0.06);
      drawFooterBar(ctx, { text: spec.footer, width: W, y: H - footerH, height: footerH, accentColor: accent });
    }

    // Bullets (info card) — anchored just above the footer.
    let bulletsTop = H - footerH - Math.round(H * 0.02);
    if (Array.isArray(spec.bullets) && spec.bullets.length) {
      const bFontSize = Math.round(W * 0.024);
      const bullets = spec.bullets.slice(0, 6);
      const cardH = 24 * 2 + bullets.length * (bFontSize * 1.5);
      const cardY = bulletsTop - cardH;
      drawInfoCard(ctx, { x: marginX, y: cardY, w: maxWidth, bullets, accentColor: accent, style: style === 'glass' ? 'glass' : 'flat', fontSize: bFontSize });
      bulletsTop = cardY - Math.round(H * 0.02);
    }

    // Callouts — a row of small colored pills, sitting just above whatever
    // is already anchored below (bullets, footer, or the canvas edge).
    if (Array.isArray(spec.callouts) && spec.callouts.length) {
      const cFontSize = Math.round(W * 0.02);
      let cx = marginX;
      const cy = bulletsTop - (cFontSize + 20);
      spec.callouts.slice(0, 4).forEach((c) => {
        const text = typeof c === 'string' ? c : (c && c.text) || '';
        if (!text) return;
        const dims = drawBadge(ctx, { text, x: cx, y: cy, accentColor: accent, fontSize: cFontSize, style: 'flat' });
        cx += dims.w + 12;
      });
      bulletsTop = cy - Math.round(H * 0.015);
    }

    // Subhead — directly above whatever's anchored below it so far. Body
    // text always renders in FONT_ROLES.body (the picker only governs the
    // headline's own typeface), so line count is measured against that
    // family, not the chosen display font.
    let headlineBottomLimit = bulletsTop;
    if (spec.subhead) {
      const subFontSize = Math.round(W * 0.026);
      const subLines = countWrappedLines(ctx, spec.subhead, maxWidth, 400, subFontSize, FONT_ROLES.body.family);
      const subY = headlineBottomLimit - (subLines - 1) * subFontSize * 1.3;
      drawSubhead(ctx, { text: spec.subhead, x: marginX, y: subY, maxWidth, fontSize: subFontSize, style });
      headlineBottomLimit = subY - subFontSize * 1.3 - subFontSize * 0.5;
    }

    // Headline — the main event. When there's a subhead/bullets/callouts/
    // footer anchored below it, it sits bottom-up against that (last
    // line's baseline just above the next element) — see countWrappedLines
    // above for the real (not guessed) wrapped-line count this positioning
    // depends on. But `headlineBottomLimit` defaults to just above the
    // canvas's bottom edge when NONE of those are present, which used to
    // mean a bare headline-only flyer (the single most common case) got its
    // headline glued to the bottom edge instead of placed sensibly — this
    // is the bug reported by a real customer ("the headline is coming
    // below, not in the middle again"). Fixed: with nothing anchored below,
    // center the headline block vertically in the frame instead.
    const hasBodyBelow = !!(spec.footer || (Array.isArray(spec.bullets) && spec.bullets.length) || (Array.isArray(spec.callouts) && spec.callouts.length) || spec.subhead);
    const fontSize = Math.round(W * 0.09);
    const headlineLines = countWrappedLines(ctx, spec.headline, maxWidth, 400, fontSize, family);
    const lineHeight = fontSize * 1.05;
    let headlineY;
    if (hasBodyBelow) {
      headlineY = headlineBottomLimit - (headlineLines - 1) * lineHeight;
    } else {
      const blockHeight = (headlineLines - 1) * lineHeight + fontSize;
      const minY = Math.round(H * 0.12 + fontSize * 0.85);
      headlineY = Math.max(minY, Math.round((H - blockHeight) / 2 + fontSize * 0.85));
    }
    drawHeadline(ctx, {
      text: spec.headline, x: marginX, y: headlineY, maxWidth, fontSize,
      accentColor: accent, accentWord: spec.accent_word, align: 'left',
      style, underline: !!spec.underline_accent, gradientWhole: !!spec.gradient_whole,
      fontFamily: family, fontWeight: 400,
    });

    let outBuf = canvas.toBuffer('image/png');
    if (project.aspect) {
      const ratioMap = { '1:1': 1, '9:16': 9 / 16, '4:5': 4 / 5, '3:4': 3 / 4, '16:9': 16 / 9 };
      const ratio = ratioMap[project.aspect];
      if (ratio) outBuf = await cropToAspect(outBuf, ratio);
    }

    const storagePath = `${user.id}/flyer-font-${projectId}-${Date.now()}.png`;
    const { error: upErr } = await db.storage.from('avatars').upload(storagePath, outBuf, { contentType: 'image/png', upsert: true });
    if (upErr) throw new Error(upErr.message);
    const finalUrl = db.storage.from('avatars').getPublicUrl(storagePath).data.publicUrl;

    await db.from('flyer_projects').update({ final_url: finalUrl, text_spec: spec, updated_at: new Date().toISOString() }).eq('id', projectId);
    try {
      await db.from('generations').insert({
        user_id: user.id, type: 'image', model: 'font-picker:' + (fontId || 'default'), prompt: spec.headline,
        aspect: project.aspect, output_url: finalUrl, credits_spent: cost,
      });
    } catch (e) {}

    return json(200, { ok: true, url: finalUrl, project_id: projectId, font: family });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not composite with that font.' });
  }
};

exports.FONT_LIBRARY_FOR_UI = FONT_LIBRARY;
