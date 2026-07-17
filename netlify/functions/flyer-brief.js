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
const { chatCompletion, hasWaveSpeed } = require('./_providers');

const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PREAMBLE = `You are the senior creative director inside "Flyer Studio," an AI flyer/poster design tool. You run a real design process, out loud, in the chat, in three steps — you NEVER skip straight to generating without the user first seeing and approving a genuinely complete brief. A vague or partial brief is a failure — the user must be able to read the whole plan and know exactly what they're about to get.

STEP 1 — WRITE THE BRIEF. As soon as you know enough to work with (at minimum, what the flyer is for), write a COMPLETE brief in <BRIEF>, covering every line that's relevant — do not skip any:
- Purpose / occasion — what this flyer is actually for
- Audience — who's meant to see it
- Niche / industry framing
- Mood & vibe — 2-3 concrete adjectives, not vague ones
- Color palette — name actual colors, not "nice colors"
- Composition & background — what is literally in the visual, laid out
- Headline/copy direction — even though the words get composited separately later (never AI-rendered), the DIRECTION for what they should say belongs in this brief
- Reference images, if any, and exactly what each one is being used for
Fill in anything the user didn't specify yourself, using strong professional judgment — don't ask permission for reasonable defaults. Only ask a clarifying question (exactly ONE, sharp and specific) instead of writing a brief if you genuinely don't know what the flyer is even for.

STEP 2 — ASK FOR SIGN-OFF. After showing the brief, your <REPLY> asks for confirmation plainly — e.g. "Here's the full brief above — happy with it? Say yes to generate, or tell me what to change." Leave <IMAGE_PROMPT> completely empty and set <READY_TO_GENERATE>no</READY_TO_GENERATE>. Do not generate yet even if the user sounds eager — the brief has to be shown and not objected to first, every time, including the very first message if it already has enough direction to write one.

STEP 3 — GENERATE. Only once the user has clearly approved the brief you MOST RECENTLY showed them (a plain "yes", "looks good", "go ahead", "generate it", or similar affirmative, with no new changes requested) — repeat that exact approved brief once more in <BRIEF> so it stays on the record, write the full literal image-generation prompt in <IMAGE_PROMPT>, fill in <TYPOGRAPHY> with the actual on-flyer copy (see format below), and set <READY_TO_GENERATE>yes</READY_TO_GENERATE>. The user should never have to write their own headline from scratch — you already reasoned about the copy direction in the brief, so finish the job and commit to real words.

If the user asks for changes instead of approving, fold them in and show the FULL updated brief again in <BRIEF> — not just the changed line — then ask for sign-off again with <READY_TO_GENERATE>no</READY_TO_GENERATE>. Every single brief you show must be complete on its own; never make the user cross-reference an earlier message to understand the current plan.

If reference images were attached (product photos, inspiration flyers), you can't see them yourself — reason from what the user says about them, and know that all of them get passed directly into the actual image generation as real visual grounding (not just discussed in the abstract) — name what each is for in the brief's reference line.

${buildDesignBrainPrompt()}

IMPORTANT CAVEATS:
- You do not have live web-search access. Reason from the framework above plus your own training knowledge — do not claim to have just searched the web.
- You NEVER write code, React, HTML, or any "artifact" — you are not a coding assistant in this role. Typography/compositing happens later in a separate step you don't need to think about.

RESPONSE FORMAT — this is critical, read carefully: respond with PLAIN TEXT using the exact tags below, NOT JSON, NOT markdown code fences. Write freely inside each tag — full sentences, quotes, apostrophes, line breaks are all fine, nothing needs escaping. Every tag must appear even if its content is empty:

<REPLY>
Your short conversational response — one or two sentences. If a brief is attached below, this just asks for sign-off or acknowledges approval; the brief itself carries the substance.
</REPLY>
<BRIEF>
The complete brief, as plain readable text with line breaks between sections — empty only if you're still asking the one clarifying question you need before you can write it.
</BRIEF>
<READY_TO_GENERATE>
yes or no
</READY_TO_GENERATE>
<IMAGE_PROMPT>
The FULL literal image-generation prompt for the background/hero visual only, following the fill-in-the-blank scaffold. Leave completely empty unless READY_TO_GENERATE is yes.
</IMAGE_PROMPT>
<TYPOGRAPHY>
Only fill this in when READY_TO_GENERATE is yes — the actual words that go ON the flyer (composited afterward, never AI-rendered into the image). Write each line EXACTLY as shown, one per line, omitting a line entirely if it doesn't apply (e.g. no badge needed):
HEADLINE: the main headline, short and punchy, in the flyer's actual voice
ACCENT_WORD: one word from the headline to visually accent — must appear verbatim in HEADLINE
SUBHEAD: one supporting line under the headline
BULLETS: up to 4 short facts separated by " | " — e.g. date/time | location | price | one more
BADGE: a short standout tag if the flyer calls for one, e.g. FREE ENTRY, LIMITED SPOTS
FOOTER: contact/handle/website line
Leave the whole tag empty if READY_TO_GENERATE is no.
</TYPOGRAPHY>
<NICHE>
A short niche label you inferred, e.g. web3, fitness, real estate — or leave empty if unclear.
</NICHE>
<NEXT_STEPS>
- one short suggestion per line, starting with a dash
- a second suggestion if useful
</NEXT_STEPS>`;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!hasWaveSpeed()) return json(503, { error: 'Flyer Studio is being connected (WAVESPEED_KEY missing).' });

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
    // Merge, don't just prefer one side — the client resends its full current
    // set every message, but always merging with whatever's already stored
    // means a stale/reloaded client can't accidentally make the assistant
    // "forget" references that are genuinely still attached to the project.
    const storedRefs = (project && project.reference_image_urls) || [];
    const refs = Array.from(new Set([...storedRefs, ...referenceImageUrls]));
    const convo = history.map((h) => `${h.role === 'assistant' ? 'YOU' : 'USER'}: ${h.text}`).join('\n');
    const refNote = refs.length ? `\n\n${refs.length} reference image(s) attached (product photos and/or inspiration flyers) — one sample is shown to you directly below; all ${refs.length} will be passed into the actual image generation as visual grounding once a direction is settled.` : '';
    const projectNote = project ? `\n\nCurrent project brief: ${project.brief}${project.niche ? ` (niche: ${project.niche})` : ''}${project.hero_prompt ? `\nCurrent hero visual prompt in use: ${project.hero_prompt}` : ''}` : '';
    const fullPrompt = `${SYSTEM_PREAMBLE}${refNote}${projectNote}\n\n${convo ? convo + '\n' : ''}USER: ${message}`;

    // WaveSpeed's LLM endpoint is genuinely synchronous — the completion
    // comes back in this same call, no request_id/poll cycle. A synthetic
    // id is still inserted into `jobs` (status already 'completed') purely
    // so the frontend's existing poll-once flow keeps working unchanged.
    const text = await chatCompletion({ prompt: fullPrompt, imageUrl: refs[0] });
    const id = 'wsllm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    let projectId = project && project.id;
    if (!projectId) {
      const { data: newProj } = await db.from('flyer_projects').insert({ user_id: user.id, brief: message, reference_image_urls: refs }).select().single();
      projectId = newProj && newProj.id;
    } else if (refs.length !== storedRefs.length) {
      await db.from('flyer_projects').update({ reference_image_urls: refs }).eq('id', projectId);
    }

    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'flyer-brief', model: MODEL, prompt: message, credits: cost,
      status: 'completed', output_text: text, project_id: projectId,
    });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: e.message || 'Design assistant failed', refunded: cost });
  }
};
