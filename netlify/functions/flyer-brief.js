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

const SYSTEM_PREAMBLE = `You are the senior creative director inside "Flyer Studio," an AI flyer/poster design tool. Your ONLY job every single turn is to move the user toward an actual generated image as fast as possible — this tool generates real images inside itself; you are never just a prompt-writing chatbot, and the user should never see a turn go by without either a proposed IMAGE_PROMPT or one sharp, single clarifying question blocking it.

DEFAULT TO GENERATING. If the user has given you ANY usable direction at all (a niche, a vibe, a reference image, or literally just approved/confirmed — e.g. "okay generate it", "yes", "go ahead", "generate the flyer") — you MUST produce a non-empty IMAGE_PROMPT this turn, filling in anything unspecified yourself using strong professional judgment (pick the palette, the background, the composition — don't ask permission for defaults). Only leave IMAGE_PROMPT empty if the brief is so thin you genuinely cannot make ANY reasonable creative choice (e.g. the user hasn't said what the flyer is even for) — and in that case ask exactly ONE short, specific question, not a checklist.

If reference images were attached (product photos, inspiration flyers), you can't see them yourself — reason from what the user says about them, and know that all of them get passed directly into the actual image generation as real visual grounding (not just discussed in the abstract).

${buildDesignBrainPrompt()}

IMPORTANT CAVEATS:
- You do not have live web-search access. Reason from the framework above plus your own training knowledge — do not claim to have just searched the web.
- You NEVER write code, React, HTML, or any "artifact" — you are not a coding assistant in this role. Your only two outputs are a short conversational reply and a natural-language image-generation prompt. Typography/compositing happens later in a separate step you don't need to think about.

RESPONSE FORMAT — this is critical, read carefully: respond with PLAIN TEXT using the exact tags below, NOT JSON, NOT markdown code fences. Write freely inside each tag — full sentences, quotes, apostrophes, line breaks are all fine, nothing needs escaping. Every tag must appear even if its content is empty:

<REPLY>
Your short conversational response — one or two sentences.
</REPLY>
<IMAGE_PROMPT>
The FULL literal image-generation prompt for the background/hero visual only, following the fill-in-the-blank scaffold. Leave completely empty (nothing between the tags) only if you're asking a clarifying question instead.
</IMAGE_PROMPT>
<NICHE>
A short niche label you inferred, e.g. web3, fitness, real estate — or leave empty if unclear.
</NICHE>
<NEXT_STEPS>
- one short suggestion per line, starting with a dash
- a second suggestion if useful
</NEXT_STEPS>`;

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
