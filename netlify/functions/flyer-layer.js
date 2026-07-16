// ============================================================
// POST /.netlify/functions/flyer-layer   (Flyer Studio — add a visual layer)
// Body: { project_id, instruction, extra_image_urls? }
//   extra_image_urls: up to 5 images attached to THIS specific layer call —
//   an element to insert (a logo, a product shot, a sticker) or a reference
//   flyer to copy a specific detail from. The instruction text says which;
//   this endpoint just makes sure the image(s) are actually in front of the
//   model when it edits.
// Adds ONE requested visual layer to the project's current working image
// via GPT Image 2's edit variant, routed through WaveSpeed (see
// flyer-hero.js's comment for the live-verified reasoning — same model,
// same route, falls back to nano-banana-edit only if WAVESPEED_KEY isn't
// configured), using the current hero image as the primary reference so
// everything already in place is preserved — plus this call's attached
// images, plus a few of the project's original reference images, so
// product identity doesn't drift over successive edits. This is for
// organic/photographic layers only — text, logos, and legible signage are
// NEVER added this way (that's flyer-composite.js's job, in code, for
// pixel-perfect control) — the edit prompt says so explicitly every time.
// Async submit + poll via job-status.js, which updates the project's
// hero_image_url and appends to its layers history on completion.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');
const { submitFlyerImage, hasWaveSpeed } = require('./_providers');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'gpt-image-2-ws-edit';
const FALLBACK_MODEL = 'nano-banana-edit';
const MAX_IMAGES = 5; // total across hero + this call's attachments + project refs — timeout-safety cap (see avatar-modelsheet.js's comment on the same class of issue)

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
    const layerImages = (Array.isArray(body.extra_image_urls) ? body.extra_image_urls : []).filter(Boolean).slice(0, 5);
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!instruction) return json(400, { error: 'Describe what to add.' });

    db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

    const wantsWS = hasWaveSpeed();
    const model = wantsWS ? MODEL : FALLBACK_MODEL;

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(model)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    const cost0 = IMAGE_MODELS[model];
    cost = cost0;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const attachmentNote = layerImages.length
      ? ` ${layerImages.length} additional reference image(s) are attached for this edit — the instruction above says whether each is an element to insert into the flyer, or a detail/style to copy from.`
      : '';
    const editPrompt = `Edit this image: ${instruction}.${attachmentNote} Keep everything else in the image exactly as it is — same subject, same composition, same colors elsewhere. Do NOT add any text, words, logos, watermarks, or legible signage — visual elements only.`;
    const projectRefBudget = Math.max(0, MAX_IMAGES - 1 - layerImages.length);
    const extraRefs = (Array.isArray(project.reference_image_urls) ? project.reference_image_urls : []).slice(0, projectRefBudget);
    const hosted = await Promise.all([project.hero_image_url, ...layerImages, ...extraRefs].map(muapiHostImage));
    // GPT Image 2 has no "keep current aspect" option like nano-banana's
    // 'Auto' — it needs a real enum value every time, so this reads back the
    // project's own chosen aspect (persisted at flyer-hero.js time) so an
    // edit on the working hero never reshapes it.
    const aspect = project.aspect || '4:5';

    let id;
    if (wantsWS) {
      const r = await submitFlyerImage(model, { prompt: editPrompt, aspect, images: hosted });
      if (!r) throw new Error('WaveSpeed did not start the job');
      id = r.requestId;
    } else {
      const sub = await fetch(`${MUAPI_BASE}/${model}`, {
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
      id = j.request_id || j.id;
    }
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-layer', model, prompt: instruction, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not add that layer', refunded: cost });
  }
};
