// ============================================================
// POST /.netlify/functions/flyer-composite   (Flyer Studio — final typography)
// Body: { project_id, text_spec, headline_reference_url?, features_reference_url?, cta_reference_url? }
//   text_spec: { headline, accent_word?, subhead?, bullets?: string[],
//                callouts?: string[], badge?, footer?, accent_color,
//                script_accent?, style?: 'shadow'|'glass'|'glow'|'gradient'|'flat',
//                underline_accent?, gradient_whole?, extra_instructions? }
//   headline_reference_url / features_reference_url / cta_reference_url:
//   three INDEPENDENT optional reference images — each clones only its own
//   part of a real flyer's structure (headline position/alignment/type
//   treatment; bullet/feature placement and style; CTA/badge structure),
//   not the whole layout. Attach any, none, or all three.
//
// Switched 2026-07-16 from code-drawn text (_canvas.js) to GPT Image 2 itself
// rendering the typography, per direct user request. That first pass still
// hardcoded ONE structural assumption into the prompt regardless of intent
// -- bullets always described as "one rounded panel" -- which meant every
// flyer came out with the same boxed-info-card, generically-aligned look no
// matter what was actually asked for. Fixed here: no part of the layout is
// asserted by default anymore (headline alignment, bullet treatment, CTA
// shape are all left to the model's own judgment for THIS composition
// unless a reference says otherwise), and the single "structure reference"
// image is now three independent ones so a real flyer's headline can be
// cloned without also forcing its unrelated bullet layout, and vice versa.
// Async submit + poll via job-status.js, same pattern as flyer-hero.js —
// this is now a real paid generation, not a free sub-second render.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'gpt-image-2-ws-edit';
const FALLBACK_MODEL = 'nano-banana-edit';

// Translates the structured text_spec into a natural-language instruction
// GPT Image 2 can follow directly. `refRoles` is an ordered array of role
// labels ('headline' | 'features' | 'cta') matching, 1:1 and in order, the
// reference images attached AFTER the hero image (hero is always the first
// image sent) -- e.g. refRoles=['features','cta'] means Image 2 is the
// features reference and Image 3 is the CTA reference. Explicit positional
// numbering matters here for the same reason it does in flyer-brief.js: an
// image-editing model has no way to know which attached image plays which
// role unless the prompt says so by position -- prose like "use the
// references" gets ignored or vaguely blended.
function buildCompositePrompt(spec, refRoles) {
  const accent = spec.accent_color || '#00e0c6';
  const roleImageNum = (role) => {
    const i = refRoles.indexOf(role);
    return i === -1 ? null : i + 2; // +2: image 1 is always the hero
  };
  const headlineRefNum = roleImageNum('headline');
  const featuresRefNum = roleImageNum('features');
  const ctaRefNum = roleImageNum('cta');

  const lines = [];
  lines.push('Image 1 is the flyer\'s hero visual — add real, crisp, perfectly-spelled on-flyer typography and layout on top of it, laid out to fit its own composition and open space (never crossing over a face or the main subject). Do not alter Image 1\'s own product, subject, or background — only add typography and panels on top of it.');
  if (refRoles.length) {
    if (headlineRefNum) lines.push(`Image ${headlineRefNum} is a HEADLINE STRUCTURE reference — replicate its exact headline position, alignment, and typographic treatment (only the headline; ignore everything else in that image).`);
    if (featuresRefNum) lines.push(`Image ${featuresRefNum} is a FEATURE/BULLET PLACEMENT reference — replicate its exact placement and visual style for informational elements (only that placement/style; ignore everything else in that image).`);
    if (ctaRefNum) lines.push(`Image ${ctaRefNum} is a CTA/BADGE STRUCTURE reference — replicate its exact call-to-action or badge shape and placement (only that element; ignore everything else in that image).`);
  }

  lines.push(`Headline text, in a bold heavy condensed display typeface: "${spec.headline}"${spec.accent_word ? `, with the word "${spec.accent_word}" visually accented in ${accent}` : ''}.` + (headlineRefNum ? '' : ' Choose whatever position and alignment (left, right, centered, top, bottom-anchored) best suits this specific image\'s composition — do not default to the same placement every time.'));
  if (spec.subhead) lines.push(`Subhead directly below the headline, smaller and lighter: "${spec.subhead}".`);
  if (Array.isArray(spec.callouts) && spec.callouts.length) {
    const items = spec.callouts.map((c) => `"${(typeof c === 'string' ? c : (c && c.text) || '').trim()}"`).filter((t) => t !== '""').join(', ');
    if (items) lines.push(`Short standalone colored tag/pill call-out boxes, one short line of text each, filled in ${accent} or a complementary shade: ${items}.`);
  }
  if (spec.badge) lines.push(`A small pill-shaped badge/seal in ${accent} reading "${spec.badge}".`);
  if (Array.isArray(spec.bullets) && spec.bullets.length) {
    const items = spec.bullets.slice(0, 6).map((b) => `"${b}"`).join(' / ');
    lines.push(featuresRefNum
      ? `These bullet points, styled and placed exactly as shown in the feature reference image above: ${items}.`
      : `These bullet points: ${items}. Use your own judgment for how to present them — a single panel is one option, but so is a staggered list, inline chips, or spreading them across open areas of the image; pick whatever actually suits THIS composition instead of defaulting to the same boxed card every time.`);
  }
  if (spec.footer) lines.push(`A footer strip at the very bottom edge, styled like UI chrome rather than art, holding: "${spec.footer}".`);
  const styleLine = {
    glass: `Give the text panels a frosted glassmorphic treatment — translucent, blurred, with a faint light border, dark enough underneath to stay legible over any part of the photo.`,
    glow: `Give the headline a soft colored glow in ${accent}.`,
    gradient: `Fill the headline (or its accented word) with a smooth vertical gradient from ${accent} down to a deeper shade of the same hue.`,
    flat: `Keep every text element flat-colored, no shadow, no glow.`,
    shadow: `Give every text element a soft dark drop shadow for legibility against the photo.`,
  }[spec.style] || `Give every text element a soft dark drop shadow for legibility against the photo.`;
  lines.push(styleLine);
  if (spec.underline_accent) lines.push(`Draw a thin, slightly-tilted hand-drawn-style underline swipe in ${accent} beneath the accented headline word.`);
  if (spec.extra_instructions) lines.push(`Additional direction from the designer, follow this closely — it overrides any default guidance above if the two conflict: ${spec.extra_instructions}`);
  lines.push('Keep every word spelled exactly as given above, no typos, no missing letters, no extra invented words.');
  return lines.join(' ');
}

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const spec = (body.text_spec && typeof body.text_spec === 'object') ? body.text_spec : {};
    const headlineRefUrl = (body.headline_reference_url || '').trim() || null;
    const featuresRefUrl = (body.features_reference_url || '').trim() || null;
    const ctaRefUrl = (body.cta_reference_url || '').trim() || null;
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!spec.headline) return json(400, { error: 'Add a headline first.' });

    db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found — generate a new hero visual to start fresh, then try compositing again.' });
    if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? MODEL : FALLBACK_MODEL;

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    cost = IMAGE_MODELS[model];
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    // refRoles tracks, in order, which role each NON-hero reference plays --
    // the hero always goes first below, so refRoles[i] corresponds to
    // image (i+2). Built from whichever of the three are actually attached,
    // in a fixed headline->features->cta order, so buildCompositePrompt's
    // numbering always matches what actually gets sent.
    const refRoles = [];
    const refUrls = [];
    if (headlineRefUrl) { refRoles.push('headline'); refUrls.push(headlineRefUrl); }
    if (featuresRefUrl) { refRoles.push('features'); refUrls.push(featuresRefUrl); }
    if (ctaRefUrl) { refRoles.push('cta'); refUrls.push(ctaRefUrl); }

    const prompt = buildCompositePrompt(spec, refRoles);
    const aspect = project.aspect || '4:5';
    // Re-host the hero plus every attached structure reference on MuAPI's
    // CDN, in the exact order the prompt above numbers them — the hero URL
    // may be a provider CDN URL or Supabase storage, and not every host is
    // reachable by every downstream engine.
    const toHost = [project.hero_image_url, ...refUrls];
    const hosted = await Promise.all(toHost.map(muapiHostImage));

    let id;
    if (wantsWS) {
      const r = await submitFlyerImage(model, { prompt, aspect, images: hosted });
      if (!r) throw new Error('WaveSpeed did not start the job');
      id = r.requestId;
    } else {
      const sub = await fetch(`${MUAPI_BASE}/${model}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, images_list: hosted, aspect_ratio: 'Auto' }),
      });
      const txt = await sub.text();
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
      if (!sub.ok) {
        let m = 'Engine HTTP ' + sub.status;
        if (j && j.detail) m = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
        else if (j && (j.error || j.message)) m = (j.error && j.error.message) || j.error || j.message;
        throw new Error(m);
      }
      id = j.request_id || j.id;
    }
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-composite', model, prompt: spec.headline, aspect, credits: cost, status: 'processing', project_id: projectId });
    // Save the chosen copy/style onto the project now (not waiting for
    // completion) so it round-trips through a reload even if the render fails.
    try { await db.from('flyer_projects').update({ text_spec: spec }).eq('id', projectId); } catch (e) {}
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start compositing', refunded: cost });
  }
};
