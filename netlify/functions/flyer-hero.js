// ============================================================
// POST /.netlify/functions/flyer-hero   (Flyer Studio — generate hero visual)
// Body: { project_id, prompt, aspect }
// Generates the background/hero visual ONLY (no text/logos — that's
// composited afterward via flyer-composite.js). Uses Nano Banana Pro
// (Gemini 3.0 Pro Image, routed through WaveSpeed) per Ria's explicit
// request — the final text-compositing pass (flyer-composite.js) stays on
// GPT Image 2; only hero + layer generation moved. Falls back to
// nano-banana-2 (still Google's own model family) only if WAVESPEED_KEY
// isn't configured. When the project has
// reference images attached (product photos, inspiration flyers — up to 20,
// set at flyer-brief.js time), uses the image-to-image (edit) variant so
// those refs are REAL visual grounding on the actual generation, not just
// something discussed in the abstract; with no references, falls back to
// plain text-to-image.
// Async submit + poll via job-status.js, which saves the result onto the
// project (flyer_projects.hero_image_url) when it completes.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL_T2I = 'nano-banana-pro-ws-text-to-image';
const MODEL_I2I = 'nano-banana-pro-ws-edit';
// Fallback (MuAPI, only used if WAVESPEED_KEY is missing) stays on the
// original nano-banana slugs -- these are real, confirmed MuAPI model
// names; MuAPI doesn't host Nano Banana Pro, so this is just a safety
// net, not the model Ria asked for on the main route above.
const FALLBACK_T2I = 'nano-banana';
const FALLBACK_I2I = 'nano-banana-edit';
// Nano Banana Pro (via WaveSpeed) takes a real aspect_ratio enum directly
// (confirmed live via validation-error probing) — same as the GPT Image 2
// route this replaced, no center-crop-after-generation workaround needed.

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    let projectId = body.project_id;
    const prompt = (body.prompt || '').trim();
    const aspect = body.aspect || '4:5';
    const referenceImageUrls = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : []).filter(Boolean).slice(0, 20);
    if (!prompt) return json(400, { error: 'Missing image prompt.' });

    db = admin();
    // What actually grounds THIS generation is exactly what the client sent
    // — the Hero visual panel lets the user tick individual references on
    // or off per render (e.g. just the one product shot), and that choice
    // has to be respected exactly, not silently re-expanded back out to
    // everything ever uploaded to the project.
    let refs = referenceImageUrls;
    let project = null;
    if (projectId) {
      const { data } = await db.from('flyer_projects').select('id, user_id, reference_image_urls').eq('id', projectId).maybeSingle();
      if (data && data.user_id === user.id) project = data;
      // else: the client's remembered project_id doesn't resolve (stale
      // localStorage from a different account/session, or the project was
      // otherwise removed) -- confirmed live 2026-07-18 as a real dead-end
      // for the user (a hard 404 here with no recovery). Falls through to
      // the same "create fresh" path as no project_id at all, instead of
      // blocking generation entirely.
    }
    if (project) {
      // The project's reference LIBRARY still only ever grows (union) so
      // nothing uploaded is lost and the chat keeps full context — but that
      // library is bookkeeping, separate from what this specific render uses.
      const stored = Array.isArray(project.reference_image_urls) ? project.reference_image_urls : [];
      const library = Array.from(new Set([...stored, ...referenceImageUrls])).slice(0, 20);
      const projUpdate = { aspect };
      if (library.length !== stored.length) projUpdate.reference_image_urls = library;
      try { await db.from('flyer_projects').update(projUpdate).eq('id', projectId); } catch (e) {}
    } else {
      // Generating straight from a typed prompt with no chat/project yet
      // (or a stale/invalid project_id, see above) — create one fresh so
      // this still slots into the same iterate-and-layer flow afterward.
      const { data: newProj } = await db.from('flyer_projects').insert({ user_id: user.id, brief: prompt, reference_image_urls: referenceImageUrls, aspect }).select().single();
      projectId = newProj && newProj.id;
    }
    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? (refs.length ? MODEL_I2I : MODEL_T2I) : (refs.length ? FALLBACK_I2I : FALLBACK_T2I);

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    const base = IMAGE_MODELS[model];
    cost = base;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    // Re-hosting on MuAPI's CDN happens concurrently inside this one function
    // call, and the whole submit only returns once every one of these
    // resolves. Was capped at 3 out of caution — but GPT Image 2's real
    // edit endpoint accepts up to 16 reference images (confirmed live
    // 2026-07-16 via WaveSpeed's own model schema), so that cap was
    // silently throwing away references the user explicitly attached,
    // which is exactly the "not all my references are being used"
    // complaint. Raised to 10 — generous enough that "all references
    // uploaded" genuinely means all of them, while still leaving headroom
    // under the real 16-image ceiling and keeping the concurrent hosting
    // fan-out from growing unbounded. Each hosting call also has its own
    // timeout — see muapiHostFile in _muapi.js — so one slow reference
    // can't stall the submission either way.
    const hostedRefs = refs.length ? await Promise.all(refs.slice(0, 10).map(muapiHostImage)) : [];

    let id;
    if (wantsWS) {
      const r = await submitFlyerImage(model, { prompt, aspect, images: hostedRefs });
      if (!r) throw new Error('WaveSpeed did not start the job');
      id = r.requestId;
    } else {
      const payload = { prompt, aspect_ratio: aspect };
      if (hostedRefs.length) payload.images_list = hostedRefs;
      const sub = await fetch(`${MUAPI_BASE}/${model}`, {
        method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-hero', model, prompt, aspect, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start generation', refunded: cost });
  }
};
