// ============================================================
// POST /.netlify/functions/flyer-hero   (Flyer Studio — generate hero visual)
// Body: { project_id, prompt, aspect }
// Generates the background/hero visual ONLY (no text/logos — that's
// composited afterward via flyer-composite.js). GPT Image 2 throughout:
// when the project has reference images attached (product photos,
// inspiration flyers — up to 20, set at flyer-brief.js time), uses the
// image-to-image variant so those refs are REAL visual grounding on the
// actual generation, not just something discussed in the abstract; with no
// references, falls back to plain text-to-image.
// Async submit + poll via job-status.js, which saves the result onto the
// project (flyer_projects.hero_image_url) when it completes.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL_T2I = 'gpt-image-2-text-to-image';
const MODEL_I2I = 'gpt-image-2-image-to-image';
const OPENAI_SIZE = { '1:1': '1024x1024', '9:16': '1024x1536', '4:5': '1024x1536', '3:4': '1024x1536', '16:9': '1536x1024' };

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
    if (projectId) {
      const { data: project } = await db.from('flyer_projects').select('id, user_id, reference_image_urls').eq('id', projectId).maybeSingle();
      if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
      // The project's reference LIBRARY still only ever grows (union) so
      // nothing uploaded is lost and the chat keeps full context — but that
      // library is bookkeeping, separate from what this specific render uses.
      const stored = Array.isArray(project.reference_image_urls) ? project.reference_image_urls : [];
      const library = Array.from(new Set([...stored, ...referenceImageUrls])).slice(0, 20);
      if (library.length !== stored.length) {
        try { await db.from('flyer_projects').update({ reference_image_urls: library }).eq('id', projectId); } catch (e) {}
      }
    } else {
      // Generating straight from a typed prompt with no chat/project yet —
      // create one on the fly so this still slots into the same iterate-
      // and-layer flow afterward.
      const { data: newProj } = await db.from('flyer_projects').insert({ user_id: user.id, brief: prompt, reference_image_urls: referenceImageUrls }).select().single();
      projectId = newProj && newProj.id;
    }
    const model = refs.length ? MODEL_I2I : MODEL_T2I;

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    const base = IMAGE_MODELS[model];
    cost = base;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    // GPT Image 2 only understands `size` (one of 3 fixed dimensions) — it
    // has no `aspect_ratio` field, so that never did anything useful and
    // sending it anyway risked confusing MuAPI's request validation. The
    // requested aspect that GPT Image 2 can't natively hit (4:5 has no
    // matching size — it's approximated as the 2:3 portrait size) gets
    // center-cropped to the exact ratio once the job completes, in
    // job-status.js.
    const payload = { prompt, size: OPENAI_SIZE[aspect] || OPENAI_SIZE['1:1'] };
    // Re-hosting on MuAPI's CDN happens concurrently inside this one function
    // call, and the whole submit only returns once every one of these
    // resolves. More reference images also means a heavier, slower
    // image-to-image call once it reaches the model itself — real generation
    // was still taking minutes with 6 attached, so this is capped hard at 3:
    // enough to genuinely ground the generation (product shot, one style
    // reference, one layout reference) without turning every hero render
    // into a multi-minute wait. Each hosting call also has its own timeout —
    // see muapiHostFile in _muapi.js — so one slow reference can't stall the
    // submission either way.
    if (refs.length) payload.images_list = await Promise.all(refs.slice(0, 3).map(muapiHostImage));
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
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-hero', model, prompt, aspect, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start generation', refunded: cost });
  }
};
