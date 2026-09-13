// ============================================================
// POST /.netlify/functions/video-omni-edit   (Editing Studio — AI Auto-Edit)
// Body: { project_id, instructions }
// A holistic, single-prompt AI video edit via WaveSpeed's Gemini Omni Video
// Edit — real restyling/relighting/color-grading/cuts driven by one
// instruction, not the deterministic transcribe->caption->element->CTA
// pipeline (_captions.js etc). Use this for "just make the whole thing
// look premium" asks; use the granular tools for precise caption/element
// control. Both operate on the same project and current working video.
// Async submit + poll via job-status.js (kind:'video-omni-edit'), which
// saves the result onto video_edit_projects.final_video_url.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { VIDEO_MODELS, canUseFree, canUseTrial } = require('./_packs');
const { submitVideoEdit, hasWaveSpeed } = require('./_providers');

const MODEL = 'gemini-omni-flash-video-edit';

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!hasWaveSpeed()) return json(503, { error: 'AI Auto-Edit is being connected (WAVESPEED_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const projectId = body.project_id;
    const instructions = (body.instructions || '').trim();
    if (!projectId) return json(400, { error: 'Missing project_id' });
    if (!instructions) return json(400, { error: 'Describe the edit you want.' });

    db = admin();
    const { data: project } = await db.from('video_edit_projects').select('*').eq('id', projectId).maybeSingle();
    if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
    const videoUrl = project.final_video_url || project.source_video_url;

    let plan = 'pro', isAdmin = false, hasPurchased = true;
    try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; hasPurchased = p.hasPurchased; } catch (e) {}
    if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
      return json(403, { error: 'AI Auto-Edit requires a subscription. Upgrade to unlock it.', code: 'PLAN_REQUIRED' });
    }
    if (plan === 'free' && !isAdmin && !hasPurchased && !canUseTrial(MODEL)) {
      return json(403, { error: 'Free trial credits only cover our starter models. Buy a credit pack to unlock every model.', code: 'TRIAL_TIER_ONLY' });
    }

    cost = VIDEO_MODELS[MODEL];
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const { requestId } = await submitVideoEdit({ video: videoUrl, prompt: instructions });
    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'video-omni-edit', model: MODEL, prompt: instructions, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: requestId, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start the edit', refunded: cost });
  }
};
