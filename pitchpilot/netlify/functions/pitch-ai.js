// ============================================================
// POST /.netlify/functions/pitch-ai
// Body: { jobText, client:{name,company,location,history}, prevJobs:[..],
//         profile, projects, project, extra }
// You fill in the client details by hand now (no auto-extract, no Serper).
// One strong Claude model (Sonnet 4.5 via your MuAPI key) reads everything and
// writes the 4 outreach messages: EMAIL, WHATSAPP, INSTAGRAM, LINKEDIN
// (+ a short LinkedIn connect note). Built for personal outreach — you find the
// client's contact details yourself and reach out directly, not Upwork proposals.
// Requires env var: MUAPI_KEY
// ============================================================
const MUAPI = 'https://api.muapi.ai/api/v1';
// Strongest pitch-writer available on MuAPI. ("Claude Fable 5" is the chat model
// you talk to in Claude — it isn't offered as an API model on MuAPI, so the app
// uses Claude Sonnet 4.5, the best writer their API exposes.)
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
  try {
    if (event.httpMethod !== 'POST') return resp(405, { error: 'Method not allowed' });
    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return resp(400, { error: 'Bad request' }); }
    const jobText = (body.jobText || '').slice(0, 6000);
    if (!jobText.trim()) return resp(400, { error: 'Paste the job post first.' });

    const c = body.client || {};
    const prevJobs = (Array.isArray(body.prevJobs) ? body.prevJobs : []).filter((x) => x && x.trim()).slice(0, 2);
    const pf = body.profile || {};
    const projects = Array.isArray(body.projects) ? body.projects.slice(0, 20) : [];
    const pinned = body.project || null;
    const extra = (body.extra || '').slice(0, 600);

    const projList = projects.length
      ? projects.map((p, i) => `${i + 1}. "${p.title}" - ${p.desc || ''}${p.tags ? ` [${p.tags}]` : ''}${p.link ? ` (${p.link})` : ''}`).join('\n')
      : '(none saved)';

    const prompt =
`You are an elite freelance outreach writer. You study what actually books high-paying clients through DIRECT personal outreach (not Upwork proposals) - a specific, personal opening that proves you researched THEM, one clear value point tied to their exact need, social proof, and a single low-friction call to action. You write like a real person who genuinely wants to help this specific business, never like a mass template. Out of every 10 messages you write, at least 1 should get a reply that turns into a paid client.

THE JOB / WHAT THEY NEED:
"""${jobText}"""

THE CLIENT (filled in by the freelancer):
- Name: ${c.name || '(unknown - address warmly as "there" / "hi team")'}
- Company: ${c.company || '(unknown)'}
- Location: ${c.location || '(unknown)'}
- What we know about them (history / context): ${c.history || '(none given)'}
${prevJobs.length ? `- Other jobs this client has posted before (use these to show you understand their bigger picture and recurring needs):\n${prevJobs.map((p, i) => `   Previous job ${i + 1}: ${p}`).join('\n')}` : ''}

THE FREELANCER (the sender):
- Name: ${pf.name || '[Your name]'}
- Headline: ${pf.head || 'AI creator / web designer'}
- Offer: ${pf.offer || 'Custom AI-built websites & content, fast turnaround, revisions until happy'}
- Portfolio link: ${pf.port || ''}

SAVED PORTFOLIO PROJECTS (feature the most relevant one, by name):
${projList}
${pinned ? `\nThe freelancer wants to feature this project: "${pinned.title}" - ${pinned.desc || ''}` : ''}
${extra ? `\nExtra to weave in naturally: ${extra}` : ''}

Write FOUR outreach messages plus one short LinkedIn connect note. Each must feel freshly written for THIS client - reference their company, their need, and (if given) their previous jobs. Return ONLY valid minified JSON (no prose, no markdown):

{"projectSuggestion":"",
"pitches":{"email":"","whatsapp":"","instagram":"","linkedin":"","connect":""}}

Rules:
- projectSuggestion: one sentence naming which saved project best fits this job and why - or, if none fit, what kind of demo/sample to create for them before reaching out.
- email: a "Subject:" line then the body. Personal, specific to their business, proves you looked at them, one clear value point, social proof, and a soft CTA to hop on a quick call or reply. Under 170 words. No "I hope this email finds you well".
- whatsapp: warm, human, under 70 words, first person, like a real message not an ad.
- instagram: casual DM tone, under 70 words, can use one emoji, references their page/brand.
- linkedin: professional but personable, under 200 words, references their company/role.
- connect: a LinkedIn connection request note, UNDER 200 characters.
- Address the client by first name if known, else a warm neutral ("there" / "hi team"). Never invent a fake fact, email, phone number, or result not given above.
- Output JSON ONLY.`;

    const raw = await claude(prompt);
    const data = parseJSON(raw);
    if (!data || !data.pitches) return resp(502, { error: 'AI did not return usable output - tap generate again.', raw: raw.slice(0, 300) });
    return resp(200, { ok: true, projectSuggestion: data.projectSuggestion || '', pitches: data.pitches });
  } catch (e) {
    return resp(500, { error: (e && e.message) || 'pitch-ai failed' });
  }
};

function resp(statusCode, b) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) };
}
