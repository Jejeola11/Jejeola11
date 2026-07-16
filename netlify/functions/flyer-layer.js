// ============================================================
// POST /.netlify/functions/flyer-layer   (Flyer Studio — add a visual layer)
// Body: { project_id, instruction }
// Adds ONE requested visual element to the project's current working image
// (e.g. "add a soft neon rim light", "add floating particles in the
// background") via nano-banana-edit, using the current hero image as the
// reference so everything already in place is preserved. This is for
// organic/photographic layers only — text, logos, and legible signage are
// NEVER added this way (that's flyer-composite.js's job, in code, for
// pixel-perfect control) — the edit prompt says so explicitly every time.
// Async submit + poll via job-status.js, which updates the project's
// hero_image_url and appends to its layers history on completion.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');
const { muapiHostImage } = require('./_muapi');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'nano-banana-edit';

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
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!instruction) return json(400, { error: 'Describe what to add.' });

    db = admin();
    const { data: project } = await db.from('flyer_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    const cost0 = IMAGE_MODELS[MODEL];
    cost = cost0;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const editPrompt = `Edit this image: ${instruction}. Keep everything else in the image exactly as it is — same subject, same composition, same colors elsewhere. Do NOT add any text, words, logos, watermarks, or legible signage — visual elements only.`;
    const hosted = await muapiHostImage(project.hero_image_url);
    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: editPrompt, images_list: [hosted] }),
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

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-layer', model: MODEL, prompt: instruction, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not add that layer', refunded: cost });
  }
};
