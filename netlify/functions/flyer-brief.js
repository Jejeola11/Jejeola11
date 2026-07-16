// ============================================================
// POST /.netlify/functions/flyer-brief   (Flyer Studio — design assistant)
// Body: { message, history?, project_id? }
//   history: [{role:'user'|'assistant', text}] — the browser keeps and
//   resends the conversation; nothing is stored server-side per-turn.
// Acts as a senior flyer designer: reasons from the embedded design-brain
// (anchor template + niche method + anti-AI-look rules — see
// _flyer-knowledge.js) to propose a creative direction AND a literal,
// ready-to-generate image prompt (background/hero visual only — text is
// always composited afterward, never AI-rendered). Async submit + poll via
// job-status.js, same pattern as every other AI call in this app.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { REACTOR_COST, canUseFree } = require('./_packs');
const { buildDesignBrainPrompt } = require('./_flyer-knowledge');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PREAMBLE = `You are the senior creative director inside "Flyer Studio," an AI flyer/poster design tool. You are having a real design conversation with the user — not a one-shot prompt generator. Act like an actual designer: ask a clarifying question if the brief is too thin to make a strong creative choice, otherwise commit to a direction and explain WHY in plain, confident language (one or two sentences, not a lecture).

${buildDesignBrainPrompt()}

IMPORTANT CAVEAT ON "RESEARCH": you do not have live web-search access. Reason from the framework above plus your own training knowledge of real brands/creators in the stated niche — do not claim to have just searched the web.

Respond with STRICT JSON only, no markdown fences, no prose outside the JSON, matching exactly this shape:
{"reply": "your conversational response to the user, explaining the direction or asking a clarifying question", "image_prompt": "the FULL literal image-generation prompt for the background/hero visual only, following the fill-in-the-blank scaffold — or empty string if you're still asking a clarifying question and not ready to propose a visual yet", "niche": "a short niche label you inferred, e.g. web3, fitness, real estate, or empty string if unclear", "suggested_next_steps": ["short suggestion 1", "short suggestion 2"]}`;

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
  const message = (body.message || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  if (!message) return json(400, { error: 'Describe what you want to design.' });

  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  const cost = REACTOR_COST[MODEL];
  if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
    return json(403, { error: 'Flyer Studio\'s design assistant requires a subscription.', code: 'PLAN_REQUIRED' });
  }

  const db = admin();
  let project = null;
  if (body.project_id) {
    const { data } = await db.from('flyer_projects').select('*').eq('id', body.project_id).maybeSingle();
    if (data && data.user_id === user.id) project = data;
  }

  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    const convo = history.map((h) => `${h.role === 'assistant' ? 'YOU' : 'USER'}: ${h.text}`).join('\n');
    const projectNote = project ? `\n\nCurrent project brief: ${project.brief}${project.niche ? ` (niche: ${project.niche})` : ''}${project.hero_prompt ? `\nCurrent hero visual prompt in use: ${project.hero_prompt}` : ''}` : '';
    const fullPrompt = `${SYSTEM_PREAMBLE}${projectNote}\n\n${convo ? convo + '\n' : ''}USER: ${message}`;

    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt }),
    });
    const txt = await sub.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!sub.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not return a job id.');

    let projectId = project && project.id;
    if (!projectId) {
      const { data: newProj } = await db.from('flyer_projects').insert({ user_id: user.id, brief: message }).select().single();
      projectId = newProj && newProj.id;
    }

    const immediate = extractText(j);
    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'flyer-brief', model: MODEL, prompt: message, credits: cost,
      status: immediate ? 'completed' : 'processing', output_text: immediate || null, project_id: projectId,
    });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: e.message || 'Design assistant failed', refunded: cost });
  }
};
