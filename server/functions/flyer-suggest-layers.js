// ============================================================
// POST /.netlify/functions/flyer-suggest-layers   (Flyer Studio)
// Body: { project_id }
// Looks at the project's CURRENT hero visual — real vision, not just the
// text prompt that made it — and proposes 3-4 concrete layer ideas, so
// "Add a layer" isn't a blank box the user has to fill from nothing.
// Synchronous-ish: a short text completion, no image generation involved,
// same async submit+poll pattern as every other assistant call for
// consistency (job-status.js treats this as a text-kind job).
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { REACTOR_COST, canUseFree } = require('./_packs');
const { hasWaveSpeed, encodeModelImage, triggerTextWorker } = require('./_providers');

const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `You are a senior flyer/poster art director looking at a generated hero visual. Suggest exactly 3-4 concrete, specific visual layer additions that would genuinely elevate THIS SPECIFIC image — lighting effects, props, textures, atmosphere, depth, framing. Each suggestion must be a short, ready-to-use edit instruction, written imperatively and specifically (e.g. "Add a warm rim light behind the subject's left edge" — never a vague note like "improve the lighting"). Base every suggestion on what is actually visible in the image, not generic advice that could apply to any flyer. Reply with ONLY the suggestions, one per line, each starting with a dash — no preamble, no explanation, nothing else.`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!hasWaveSpeed()) return json(503, { error: 'Flyer Studio is being connected (WAVESPEED_KEY missing).' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  if (!projectId) return json(400, { error: 'Missing project_id' });

  const db = admin();
  const { data: project } = await db.from('flyer_projects').select('id, user_id, hero_image_url').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'This project could not be found — generate a new hero visual to start fresh.' });
  if (!project.hero_image_url) return json(400, { error: 'Generate the hero visual first.' });

  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  const cost = REACTOR_COST[MODEL];
  if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
    return json(403, { error: 'This requires a subscription.', code: 'PLAN_REQUIRED' });
  }

  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    const id = 'wsllm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'flyer-suggest-layers', model: encodeModelImage(MODEL, project.hero_image_url), prompt: SYSTEM, credits: cost,
      status: 'processing', project_id: projectId,
    });
    triggerTextWorker(id);
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: e.message || 'Could not get suggestions', refunded: cost });
  }
};
