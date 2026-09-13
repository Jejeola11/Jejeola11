// ============================================================
// POST /.netlify/functions/flyer-layer-image   (Flyer Studio)
// Body: { project_id, layer_id, tweak? }
//
// Generates the artwork for ONE image layer of a design spec. This is the
// unit the whole rebuild turns on: because every image element is generated
// separately and cached by layer id, changing the product never re-rolls the
// background, and "regenerate just this" is a real operation rather than a
// new poster that happens to look similar.
//
// `tweak` is the layer-level instruction from the editor — select the fries,
// type "diamond", and that word arrives here and is folded into THIS layer's
// prompt only. The original spec prompt is never overwritten, so a tweak can
// be undone by simply regenerating without one.
//
// The prompt is assembled by buildLayerImagePrompt() rather than passed
// through, so the palette lock, print physics and the anti-"AI look"
// negatives are attached to every layer automatically — they cannot be
// forgotten on an individual element, which is exactly how a single glowing,
// gradient-filled object ends up ruining an otherwise flat poster.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree, canUseTrial } = require('./_packs');
const { buildLayerImagePrompt } = require('./_flyer-spec');
const { submitFlyerImage, hasWaveSpeed, muapiHostImage } = require('./_providers');

const MODEL_T2I = 'gpt-image-2-ws-text-to-image';
const MODEL_I2I = 'gpt-image-2-ws-edit';

// The generated asset is drawn into the layer's own box, so asking for the
// closest aspect to that box keeps it from being letterboxed inside its slot.
const ASPECTS = [['1:1', 1], ['4:5', 0.8], ['3:4', 0.75], ['9:16', 0.5625], ['16:9', 1.7778], ['3:2', 1.5], ['2:3', 0.6667]];
function nearestAspect(w, h) {
  if (!w || !h) return '1:1';
  const r = w / h;
  return ASPECTS.reduce((best, a) => (Math.abs(a[1] - r) < Math.abs(best[1] - r) ? a : best))[0];
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  const layerId = body.layer_id;
  const tweak = (body.tweak || '').trim().slice(0, 400);
  if (!projectId || !layerId) return json(400, { error: 'Missing project_id or layer_id' });

  const db = admin();
  let cost = 0;
  try {
    const { data: project } = await db.from('flyer_projects')
      .select('id,user_id,design_spec,reference_image_urls').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found' });

    const spec = project.design_spec;
    if (!spec || !Array.isArray(spec.layers)) return json(400, { error: 'This project has no design spec yet.' });

    const layer = spec.layers.find((l) => l.id === layerId);
    if (!layer) return json(404, { error: 'Layer not found in this design.' });
    if (layer.type !== 'image') return json(400, { error: 'That layer is not an image layer.' });

    // A tweak modifies the subject; it must not be allowed to dissolve the
    // locked half of the spec, so it goes in as an explicit amendment ahead
    // of the palette/physics/negatives block rather than replacing anything.
    const layerForPrompt = tweak
      ? Object.assign({}, layer, { prompt: `${layer.prompt}\n\nAMENDMENT — apply this change to the subject above, keeping everything else about it the same: ${tweak}` })
      : layer;
    const prompt = buildLayerImagePrompt(layerForPrompt, spec);

    // refIndex is 1-based because that is how the user counted their own
    // uploads. Resolve it here; a stale index (they removed an attachment
    // after the spec was written) generates without a reference rather than
    // silently grabbing whichever file now sits at that position.
    const refs = Array.isArray(project.reference_image_urls) ? project.reference_image_urls : [];
    const refUrl = layer.refIndex && refs[layer.refIndex - 1] ? refs[layer.refIndex - 1] : null;

    let plan = 'pro', isAdmin = false, hasPurchased = true;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; hasPurchased = p.hasPurchased; } catch (e) {}
    const wantsWS = hasWaveSpeed();
    const model = refUrl ? MODEL_I2I : MODEL_T2I;
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }
    if (plan === 'free' && !isAdmin && !hasPurchased && !canUseTrial(model)) {
      return json(403, { error: 'Free trial credits only cover our starter models.', code: 'TRIAL_TIER_ONLY' });
    }

    cost = IMAGE_MODELS[model];
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const aspect = nearestAspect(layer.w, layer.h);
    const hosted = refUrl ? [await muapiHostImage(refUrl)] : [];

    if (!wantsWS) throw new Error('Image engine is not configured (WAVESPEED_KEY missing).');
    const r = await submitFlyerImage(model, { prompt, aspect, images: hosted });
    if (!r || !r.requestId) throw new Error('Engine did not start the job');

    // Which layer this job belongs to rides along in `meta` (the existing
    // jobs-table convention) so job-status knows which slot in layer_images
    // to write the finished URL into.
    await db.from('jobs').insert({
      request_id: r.requestId, user_id: user.id, kind: 'flyer-layer-image',
      model, prompt, aspect, credits: cost, status: 'processing',
      project_id: projectId, meta: { layer_id: layerId, tweak: tweak || null },
    });
    return json(200, { request_id: r.requestId, credits: balance, layer_id: layerId });
  } catch (e) {
    try { if (cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start generation', refunded: cost });
  }
};
