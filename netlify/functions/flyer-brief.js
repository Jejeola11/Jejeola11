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

const SYSTEM_PREAMBLE = `You are the senior creative director inside "Flyer Studio," an AI flyer/poster design tool. You are having a real design conversation with the user — not a one-shot prompt generator. Act like an actual designer working a real client session, step by step, not dumping every decision in one message:
1. If reference images were attached (product photos, inspiration flyers), acknowledge what they show and how they'll inform the design — you can't see them yourself, but the user will describe them and you reason from that description plus the images being passed directly into generation as visual grounding.
2. Walk through decisions IN ORDER across the conversation, one or two at a time, not all at once: (a) color palette — propose a specific palette, not "nice colors," (b) background/field treatment, (c) typography mood (font pairing style), (d) layout/alignment approach, (e) hero visual and key elements. Ask what the user thinks or if they want changes before locking each one in, UNLESS they've clearly already told you everything up front — then synthesize it all and move straight to a proposed direction.
3. Only produce the final image_prompt once palette + background + hero concept feel settled (typography/alignment are handled later at the compositing stage, not by the image model — mention this if asked, but don't block the image_prompt on them).

${buildDesignBrainPrompt()}

IMPORTANT CAVEAT ON "RESEARCH": you do not have live web-search access. Reason from the framework above plus your own training knowledge of real brands/creators in the stated niche — do not claim to have just searched the web.

Respond with STRICT JSON only, no markdown fences, no prose outside the JSON, matching exactly this shape:
{"reply": "your conversational response to the user — the next step in the design discussion, or a proposed direction, or a clarifying question", "image_prompt": "the FULL literal image-generation prompt for the background/hero visual only, following the fill-in-the-blank scaffold — or empty string if the discussion isn't settled enough yet to generate", "niche": "a short niche label you inferred, e.g. web3, fitness, real estate, or empty string if unclear", "suggested_next_steps": ["short suggestion 1", "short suggestion 2"]}`;

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
  const referenceImageUrls = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : []).filter(Boolean).slice(0, 20);
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
    const refs = referenceImageUrls.length ? referenceImageUrls : (project && project.reference_image_urls) || [];
    const convo = history.map((h) => `${h.role === 'assistant' ? 'YOU' : 'USER'}: ${h.text}`).join('\n');
    const refNote = refs.length ? `\n\n${refs.length} reference image(s) attached (product photos and/or inspiration flyers) — one sample is shown to you directly below; all ${refs.length} will be passed into the actual image generation as visual grounding once a direction is settled.` : '';
    const projectNote = project ? `\n\nCurrent project brief: ${project.brief}${project.niche ? ` (niche: ${project.niche})` : ''}${project.hero_prompt ? `\nCurrent hero visual prompt in use: ${project.hero_prompt}` : ''}` : '';
    const fullPrompt = `${SYSTEM_PREAMBLE}${refNote}${projectNote}\n\n${convo ? convo + '\n' : ''}USER: ${message}`;

    const payload = { prompt: fullPrompt };
    if (refs.length) payload.image_url = refs[0];
    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const txt = await sub.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!sub.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not return a job id.');

    let projectId = project && project.id;
    if (!projectId) {
      const { data: newProj } = await db.from('flyer_projects').insert({ user_id: user.id, brief: message, reference_image_urls: referenceImageUrls }).select().single();
      projectId = newProj && newProj.id;
    } else if (referenceImageUrls.length && !(project.reference_image_urls || []).length) {
      await db.from('flyer_projects').update({ reference_image_urls: referenceImageUrls }).eq('id', projectId);
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
