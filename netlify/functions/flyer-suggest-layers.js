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
const { extractErrorMessage } = require('./_errors');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-sonnet-4-5';

const SYSTEM = `You are a senior flyer/poster art director looking at a generated hero visual. Suggest exactly 3-4 concrete, specific visual layer additions that would genuinely elevate THIS SPECIFIC image — lighting effects, props, textures, atmosphere, depth, framing. Each suggestion must be a short, ready-to-use edit instruction, written imperatively and specifically (e.g. "Add a warm rim light behind the subject's left edge" — never a vague note like "improve the lighting"). Base every suggestion on what is actually visible in the image, not generic advice that could apply to any flyer. Reply with ONLY the suggestions, one per line, each starting with a dash — no preamble, no explanation, nothing else.`;

function extractText(p) {
  if (!p) return '';
  if (typeof p.output === 'string') return p.output;
  if (typeof p.text === 'string') return p.text;
  if (typeof p.result === 'string') return p.result;
  if (Array.isArray(p.outputs) && p.outputs.length) return String(p.outputs[0]);
  if (p.choices && p.choices[0] && p.choices[0].message) return p.choices[0].message.content;
  if (p.output && typeof p.output === 'object') return p.output.text || '';
  return '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!process.env.MUAPI_KEY) return json(503, { error: 'Flyer Studio is being connected (MUAPI_KEY missing).' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const projectId = body.project_id;
  if (!projectId) return json(400, { error: 'Missing project_id' });

  const db = admin();
  const { data: project } = await db.from('flyer_projects').select('id, user_id, hero_image_url').eq('id', projectId).maybeSingle();
  if (!project || project.user_id !== user.id) return json(404, { error: 'Project not found.' });
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
    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: SYSTEM, image_url: project.hero_image_url }),
    });
    const txt = await sub.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!sub.ok) throw new Error(extractErrorMessage(j) || ('Engine HTTP ' + sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not return a job id.');

    const immediate = extractText(j);
    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'flyer-suggest-layers', model: MODEL, prompt: 'suggest layers', credits: cost,
      status: immediate ? 'completed' : 'processing', output_text: immediate || null, project_id: projectId,
    });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: e.message || 'Could not get suggestions', refunded: cost });
  }
};
