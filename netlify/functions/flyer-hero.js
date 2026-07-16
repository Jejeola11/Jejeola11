// ============================================================
// POST /.netlify/functions/flyer-hero   (Flyer Studio — generate hero visual)
// Body: { project_id, prompt, aspect }
// Generates the background/hero visual ONLY (no text/logos — that's
// composited afterward via flyer-composite.js). Uses gpt-image-2, the same
// model already wired for the general Studio's photoreal image generation.
// Async submit + poll via job-status.js, which saves the result onto the
// project (flyer_projects.hero_image_url) when it completes.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { IMAGE_MODELS, canUseFree } = require('./_packs');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'gpt-image-2-text-to-image';
const OPENAI_SIZE = { '1:1': '1024x1024', '9:16': '1024x1536', '4:5': '1024x1536', '16:9': '1536x1024' };

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const prompt = (body.prompt || '').trim();
    const aspect = body.aspect || '4:5';
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!prompt) return json(400, { error: 'Missing image prompt.' });

    db = admin();
    const { data: project } = await db.from('flyer_projects').select('id, user_id').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });

    let plan = 'pro', isAdmin = false;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
      return json(403, { error: 'This requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
    }

    const base = IMAGE_MODELS[MODEL];
    cost = base;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const payload = { prompt, aspect_ratio: aspect };
    if (OPENAI_SIZE[aspect]) payload.size = OPENAI_SIZE[aspect];
    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
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

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'flyer-hero', model: MODEL, prompt, aspect, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start generation', refunded: cost });
  }
};
