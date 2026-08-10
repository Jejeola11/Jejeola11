// ============================================================
// POST /.netlify/functions/flyer-layer   (Flyer Studio — add a visual layer)
// Body: { project_id, instruction, layer_images? }
//   layer_images: [{ url, note? }] — up to 5 images attached to THIS
//   specific layer call, each with its OWN optional short note ("just the
//   logo", "the badge sticker") saying what to take from THAT image
//   specifically. Previously this was one shared `instruction` trying to
//   describe every attached image at once, which an image-editing model has
//   no reliable way to bind back to the right picture -- each image now
//   gets its own explicit, numbered instruction; `instruction` itself is
//   still free for the overall placement/style direction (where it goes,
//   how big, blended how).
// Adds ONE requested visual layer to the project's current working image
// via GPT Image 2's edit variant, routed through WaveSpeed (matches
// flyer-hero.js — both moved back from Nano Banana Pro after real
// multi-reference generations weren't actually grounded in what was
// attached; falls back to nano-banana-edit on MuAPI only if WAVESPEED_KEY
// isn't configured), using the current hero image as the primary reference
// so everything already in place is preserved — plus this call's attached
// images, plus a few of the project's original reference images, so
// product identity doesn't drift over successive edits. This is for
// organic/photographic layers only — text, logos, and legible signage are
// NEVER added this way (that's flyer-composite.js's job, in code, for
// pixel-perfect control) — the edit prompt says so explicitly every time.
// Async submit + poll via job-status.js, which updates the project's
// hero_image_url and appends to its layers history on completion.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree, canUseTrial } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'gpt-image-2-ws-edit';
const FALLBACK_MODEL = 'nano-banana-edit';
// Total across hero + this call's attachments + project refs. Was 5 out of
// caution — raised to 10 now that GPT Image 2's real edit endpoint (via
// WaveSpeed) is confirmed live to accept up to 16 images, so 5 was
// needlessly dropping references the user actually attached.
const MAX_IMAGES = 10;

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const instruction = (body.instruction || '').trim();
    const layerImages = (Array.isArray(body.layer_images) ? body.layer_images : [])
      .filter((x) => x && typeof x.url === 'string' && x.url)
      .slice(0, 5)
      .map((x) => ({ url: x.url, note: (x.note || '').trim() }));
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!instruction) return json(400, { error: 'Describe what to add.' });

    db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found — generate a new hero visual to start fresh, then try adding the layer again.' });
    if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? MODEL : FALLBACK_MODEL;

    let plan = 'pro', isAdmin = false, hasPurchased = true;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; hasPurchased = p.hasPurchased; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }
    if (plan === 'free' && !isAdmin && !hasPurchased && !canUseTrial(model)) {
      return json(403, { error: 'Free trial credits only cover our starter models. Buy a credit pack to unlock every model.', code: 'TRIAL_TIER_ONLY' });
    }

    const cost0 = IMAGE_MODELS[model];
    cost = cost0;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    // Image 1 is always the current hero (sent first below) -- each
    // attached layer image gets an explicit numbered note here rather than
    // one shared instruction trying to describe every attached image at
    // once, which an image-editing model has no reliable way to bind back
    // to the right picture. A blank note still tells the model that image
    // is a genuine attachment for this edit, not filler.
    const attachmentNotes = layerImages.map((img, i) => {
      const n = i + 2;
      return img.note
        ? `Image ${n} is an attached reference — take only "${img.note}" from it and ignore everything else in that image.`
        : `Image ${n} is an attached reference for this edit — use it as described in the instruction below.`;
    }).join(' ');
    const editPrompt = `Edit this image: ${instruction}. ${attachmentNotes ? attachmentNotes + ' ' : ''}Keep everything else in the image exactly as it is — same subject, same composition, same colors elsewhere. Do NOT add any text, words, logos, watermarks, or legible signage — visual elements only.`;
    const projectRefBudget = Math.max(0, MAX_IMAGES - 1 - layerImages.length);
    const extraRefs = (Array.isArray(project.reference_image_urls) ? project.reference_image_urls : []).slice(0, projectRefBudget);
    const hosted = await Promise.all([project.hero_image_url, ...layerImages.map((x) => x.url), ...extraRefs].map(muapiHostImage));
    // Nano Banana Pro has no "keep current aspect" auto option — it needs a
    // real enum value every time, so this reads back the project's own
    // chosen aspect (persisted at flyer-hero.js time) so an edit on the
    // working hero never reshapes it.
    const aspect = project.aspect || '4:5';

    // Shared MuAPI submit -- the static fallback when WAVESPEED_KEY is
    // missing entirely, and ALSO the dynamic fallback below when WaveSpeed
    // is configured but errors at runtime (e.g. an exhausted balance) --
    // otherwise a WaveSpeed top-up can't help a request that never retries
    // elsewhere on failure.
    async function muapiSubmit() {
      const sub = await fetch(`${MUAPI_BASE}/${FALLBACK_MODEL}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: editPrompt, images_list: hosted, aspect_ratio: 'Auto' }),
      });
      const txt = await sub.text();
      let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
      if (!sub.ok) {
        let m = 'Engine HTTP ' + sub.status;
        if (j && j.detail) m = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
        else if (j && (j.error || j.message)) m = (j.error && j.error.message) || j.error || j.message;
        throw new Error(m);
      }
      return j.request_id || j.id;
    }

    let id;
    if (wantsWS) {
      try {
        const r = await submitFlyerImage(model, { prompt: editPrompt, aspect, images: hosted });
        if (!r) throw new Error('WaveSpeed did not start the job');
        id = r.requestId;
      } catch (e) {
        id = await muapiSubmit();
      }
    } else {
      id = await muapiSubmit();
    }
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-layer', model, prompt: instruction, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not add that layer', refunded: cost });
  }
};
