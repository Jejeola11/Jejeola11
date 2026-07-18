// ============================================================
// POST /.netlify/functions/flyer-composite   (Flyer Studio — final typography)
// Body: { project_id, text_spec, structure_reference_url? }
//   text_spec: { headline, accent_word?, subhead?, bullets?: string[],
//                callouts?: string[], badge?, footer?, accent_color,
//                script_accent?, style?: 'shadow'|'glass'|'glow'|'gradient'|'flat',
//                underline_accent?, gradient_whole?, extra_instructions? }
//   structure_reference_url: an OPTIONAL second reference image — a real
//   flyer whose exact layout/structure (text positions, panel shapes) should
//   be replicated, while keeping this project's own hero image/product.
//
// Switched 2026-07-16 from code-drawn text (_canvas.js) to GPT Image 2 itself
// rendering the typography, per direct user request — the code renderer was
// a single fixed template (headline top, subhead, badge, info-card box,
// footer bar, always in that exact order/position), so every flyer came out
// looking structurally identical regardless of the brief. Verified live
// that GPT Image 2's edit mode renders short headline text cleanly and
// legibly, so this trade (some risk of imperfect fine print, in exchange for
// genuinely different layouts per flyer and the ability to clone an
// arbitrary reference flyer's structure) is worth it for this use case.
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
// GPT Image 2 can follow directly — since there's no fixed template anymore,
// this default guidance is what keeps a flyer with no extra_instructions
// looking considered instead of random.
function buildCompositePrompt(spec, hasStructureRef) {
  const accent = spec.accent_color || '#00e0c6';
  const lines = [];
  lines.push('Add real, crisp, perfectly-spelled on-flyer typography and layout to this image — the finished flyer\'s text and panel layer, laid out to fit this specific image\'s own composition and open space (never crossing over a face or the main subject).');
  lines.push(`Headline, in a bold heavy condensed display typeface: "${spec.headline}"${spec.accent_word ? `, with the word "${spec.accent_word}" visually accented in ${accent}` : ''}.`);
  if (spec.subhead) lines.push(`Subhead directly below the headline, smaller and lighter: "${spec.subhead}".`);
  if (Array.isArray(spec.callouts) && spec.callouts.length) {
    const items = spec.callouts.map((c) => `"${(typeof c === 'string' ? c : (c && c.text) || '').trim()}"`).filter((t) => t !== '""').join(', ');
    if (items) lines.push(`Short standalone colored tag/pill call-out boxes, one short line of text each, filled in ${accent} or a complementary shade: ${items}.`);
  }
  if (spec.badge) lines.push(`A small pill-shaped badge/seal in ${accent} reading "${spec.badge}".`);
  if (Array.isArray(spec.bullets) && spec.bullets.length) {
    const items = spec.bullets.slice(0, 6).map((b) => `"${b}"`).join(' / ');
    lines.push(`An information card — one rounded panel (solid dark or frosted glass) holding these bullet points, one line each with a small ${accent}-colored marker: ${items}.`);
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
  if (hasStructureRef) lines.push('A second reference image is attached showing a real flyer\'s exact layout to replicate — match its text positions, panel shapes, sizes, and overall composition as closely as possible, while keeping THIS (the first) image\'s own background/product untouched underneath.');
  if (spec.extra_instructions) lines.push(`Additional direction from the designer, follow this closely: ${spec.extra_instructions}`);
  lines.push('Keep every word spelled exactly as given above, no typos, no missing letters, no extra invented words. Do not alter the product, subject, or background itself — only add the typography and panels on top of it.');
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
    const structureRefUrl = (body.structure_reference_url || '').trim() || null;
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

    const prompt = buildCompositePrompt(spec, !!structureRefUrl);
    const aspect = project.aspect || '4:5';
    // Re-host both the current hero and the optional structure reference on
    // MuAPI's CDN — the hero URL may be a provider CDN URL or Supabase
    // storage, and not every host is reachable by every downstream engine.
    const toHost = [project.hero_image_url, structureRefUrl].filter(Boolean);
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
