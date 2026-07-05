// ============================================================
// POST /.netlify/functions/pitch-ai   (auth required, spends 1 use)
// Two modes:
//   mode:'job'       — { jobText, client:{name,company,location,history}, prevJobs:[..] }
//   mode:'instagram' — { ig:{username, website, about, pitching, goal} }
// Plus: { profile, projects, project, extra } in both modes.
// Claude Sonnet 4.5 (via MUAPI_KEY) writes 4 outreach messages + a LinkedIn
// connect note. Every generation costs 1 use — new accounts get 5 free,
// plans top up the allowance (see pp-grant.js).
// Env needed on this site: MUAPI_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// ============================================================
const { admin, getUser, spendUse, refundUse, json } = require('./_pp');

const MUAPI = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-sonnet-4-5';

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
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function claude(prompt) {
  const key = process.env.MUAPI_KEY;
  if (!key) throw new Error('MUAPI_KEY not set on this site');
  const sub = await fetch(`${MUAPI}/${MODEL}`, {
    method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const txt = await sub.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 120)); }
  if (!sub.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + sub.status));
  let text = extractText(j);
  const id = j.request_id || j.id;
  for (let i = 0; i < 30 && !text && id; i++) {
    await sleep(1500);
    const p = await (await fetch(`${MUAPI}/predictions/${id}/result`, { headers: { 'x-api-key': key } })).json();
    if (p.status === 'failed' || p.status === 'cancelled') throw new Error('AI ' + p.status);
    text = extractText(p);
    if (p.status === 'completed' && !text) break;
  }
  if (!text) throw new Error('No response from the model');
  return text;
}

function parseJSON(s) {
  if (!s) return null;
  let t = s.replace(/```json/gi, '```').trim();
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a === -1 || b === -1) return null;
  try { return JSON.parse(t.slice(a, b + 1)); } catch (e) { return null; }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const mode = body.mode === 'instagram' ? 'instagram' : 'job';

  // ---- build the target-specific context ----
  let targetBlock = '';
  if (mode === 'job') {
    const jobText = (body.jobText || '').slice(0, 6000);
    if (!jobText.trim()) return json(400, { error: 'Paste the job post first.' });
    const c = body.client || {};
    const prevJobs = (Array.isArray(body.prevJobs) ? body.prevJobs : []).filter((x) => x && x.trim()).slice(0, 2);
    targetBlock =
`THE JOB / WHAT THEY NEED:
"""${jobText}"""

THE CLIENT (filled in by the freelancer):
- Name: ${c.name || '(unknown - address warmly as "there" / "hi team")'}
- Company: ${c.company || '(unknown)'}
- Location: ${c.location || '(unknown)'}
- What we know about them: ${c.history || '(none given)'}
${prevJobs.length ? `- Other jobs this client posted before (use these to show you understand their recurring needs):\n${prevJobs.map((p, i) => `   Previous job ${i + 1}: ${p}`).join('\n')}` : ''}`;
  } else {
    const ig = body.ig || {};
    const biz = (ig.business || '').trim();
    const uname = (ig.username || '').trim();
    if (!biz && !uname) return json(400, { error: 'Enter the business name or their Instagram username first.' });
    targetBlock =
`THE TARGET (a business/brand the freelancer found directly — via Instagram, Google Maps, or elsewhere — and wants to pitch; there is no job post, this is proactive outreach):
- Business/brand name: ${biz || '(unknown — use their Instagram handle as the name)'}
- Instagram: ${uname ? '@' + uname.replace(/^@/, '') : '(not found/used — found via other means, e.g. Google Maps)'}
- Website: ${ig.website || '(none found — that itself may be the opportunity)'}
- Location: ${ig.city || '(unknown)'}
- What we know about them: ${ig.about || '(none given)'}
- What the freelancer wants to pitch them: ${ig.pitching || 'a new website / content'}
- The freelancer's goal with this outreach: ${ig.goal || 'land them as a paying client'}
${uname ? 'The INSTAGRAM DM is the most important message here — reference something real about their page so it never reads like spam.' : 'No Instagram handle was given, so lean on EMAIL as the primary channel — the instagram field can restate the same message in a casual DM style in case one is found later.'}`;
  }

  const pf = body.profile || {};
  const projects = Array.isArray(body.projects) ? body.projects.slice(0, 20) : [];
  const pinned = body.project || null;
  const extra = (body.extra || '').slice(0, 600);
  const projList = projects.length
    ? projects.map((p, i) => `${i + 1}. "${p.title}" - ${p.desc || ''}${p.tags ? ` [${p.tags}]` : ''}${p.link ? ` (${p.link})` : ''}`).join('\n')
    : '(none saved)';

  // ---- spend a use (refund on failure) ----
  const db = admin();
  const usesLeft = await spendUse(db, user.id);
  if (usesLeft === null) return json(402, { error: 'You have used all your pitches. Upgrade to keep going.', code: 'NO_USES' });

  try {
    const prompt =
`You are an elite freelance outreach writer. You study what actually books high-paying clients through DIRECT personal outreach - a specific, personal opening that proves you researched THEM, one clear value point tied to their exact situation, social proof, and a single low-friction call to action. You write like a real person who genuinely wants to help this specific business, never like a mass template.

${targetBlock}

THE FREELANCER (the sender):
- Name: ${pf.name || '[Your name]'}
- Headline: ${pf.head || 'AI creator / web designer'}
- Offer: ${pf.offer || 'Custom AI-built websites & content, fast turnaround, revisions until happy'}
- Portfolio link: ${pf.port || ''}

SAVED PORTFOLIO PROJECTS (feature the most relevant one, by name):
${projList}
${pinned ? `\nThe freelancer wants to feature this project: "${pinned.title}" - ${pinned.desc || ''}` : ''}
${extra ? `\nExtra to weave in naturally: ${extra}` : ''}

Write FOUR outreach messages plus one short LinkedIn connect note. Each must feel freshly written for THIS target. Return ONLY valid minified JSON (no prose, no markdown):

{"projectSuggestion":"",
"pitches":{"email":"","whatsapp":"","instagram":"","linkedin":"","connect":""}}

Rules:
- projectSuggestion: one sentence naming which saved project best fits and why - or, if none fit, what kind of demo/sample to create for them before reaching out.
- email: a "Subject:" line then the body. Personal, specific, proves you looked at them, one clear value point, social proof, soft CTA to a quick call or reply. Under 170 words. No "I hope this finds you well".
- whatsapp: warm, human, under 70 words, first person.
- instagram: casual DM tone, under 80 words, can use one emoji, must reference something real about their page/brand.
- linkedin: professional but personable, under 200 words.
- connect: a LinkedIn connection request note, UNDER 200 characters.
- Address them by first name if known, else warm neutral. Never invent a fake fact, email, phone number, or result not given above.
- Output JSON ONLY.`;

    const raw = await claude(prompt);
    const data = parseJSON(raw);
    if (!data || !data.pitches) { await refundUse(db, user.id); return json(502, { error: 'AI did not return usable output - tap generate again (use refunded).' }); }
    return json(200, { ok: true, projectSuggestion: data.projectSuggestion || '', pitches: data.pitches, uses_left: usesLeft });
  } catch (e) {
    await refundUse(db, user.id);
    return json(500, { error: (e && e.message) || 'pitch-ai failed (use refunded)' });
  }
};
