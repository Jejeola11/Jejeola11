// ============================================================
// POST /.netlify/functions/pitch-ai
// Body: { jobText, otherPosts, feedbackText, profile, projects, project, extra }
// Two-stage AI pipeline over MuAPI:
//   1) Haiku reads the job post + any other posts from this client + their
//      feedback/reviews section, and extracts name, company, location, pain
//      points and tone.
//   2) Sonnet takes that extraction plus the freelancer's profile and saved
//      portfolio projects, suggests which project to feature (or what kind
//      of project to create if nothing matches well), and writes all 6
//      pitches: Upwork proposal, LinkedIn DM, LinkedIn connect note,
//      WhatsApp, Instagram, email.
// Requires env var: MUAPI_KEY (set it in this site's Netlify env).
// ============================================================
const MUAPI = 'https://api.muapi.ai/api/v1';
const MODEL_EXTRACT = 'claude-haiku-4-5';
const MODEL_WRITE = 'claude-sonnet-4-5';

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

async function callModel(model, prompt) {
  const key = process.env.MUAPI_KEY;
  if (!key) throw new Error('MUAPI_KEY not set on this site');
  const sub = await fetch(`${MUAPI}/${model}`, {
    method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });
  const txt = await sub.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 120)); }
  if (!sub.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + sub.status));
  let text = extractText(j);
  const id = j.request_id || j.id;
  for (let i = 0; i < 40 && !text && id; i++) {
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
    if (!jobText.trim()) return resp(400, { error: 'Paste the job text first.' });
    const otherPosts = (body.otherPosts || '').slice(0, 6000);
    const feedbackText = (body.feedbackText || '').slice(0, 6000);
    const pf = body.profile || {};
    const projects = Array.isArray(body.projects) ? body.projects.slice(0, 20) : [];
    const pinnedProject = body.project || null; // if the user picked one manually
    const extra = (body.extra || '').slice(0, 600);
    const location = (body.location || '').trim(); // user-confirmed location wins if given

    // ---------- Stage 1: extract (Haiku) ----------
    const extractPrompt =
`Read the job post below, plus (if given) other posts from the same client and their feedback/reviews section. Extract what you can. Return ONLY valid minified JSON, no prose.

JOB POST:
"""${jobText}"""
${otherPosts ? `\nOTHER POSTS FROM THIS CLIENT (look for a recurring company name):\n"""${otherPosts}"""` : ''}
${feedbackText ? `\nCLIENT'S FEEDBACK/REVIEWS SECTION (look for the client's name and tone freelancers use):\n"""${feedbackText}"""` : ''}

Return JSON shaped EXACTLY:
{"firstName":"","company":"","location":"","role":"","painPoints":"","tone":"","summary":""}

Rules:
- firstName: the client's first name if findable anywhere above, else "".
- company: their brand/company — check ALL texts for a name that repeats, else "".
- location: their country/city if stated, else "".
- role: their role if stated (e.g. "founder", "marketing manager"), else "".
- painPoints: 1 short sentence on what they actually need / are struggling with, inferred from the brief.
- tone: 2-4 words describing how they write (e.g. "casual, friendly", "formal, corporate", "brief, no-nonsense") — infer from the job post and feedback section if present.
- summary: 1-sentence plain description of the job.
- Never invent a company or name that isn't actually implied by the text. Output JSON ONLY.`;

    const extractRaw = await callModel(MODEL_EXTRACT, extractPrompt);
    const client = parseJSON(extractRaw) || {};
    if (location) client.location = location; // the freelancer's own read of the location wins

    // ---------- Stage 2: suggest project + write all 6 pitches (Sonnet) ----------
    const projList = projects.length
      ? projects.map((p, i) => `${i + 1}. "${p.title}" — ${p.desc || ''}${p.tags ? ` [tags: ${p.tags}]` : ''}`).join('\n')
      : '(none saved yet)';

    const writePrompt =
`You are an elite freelance pitch writer. You study what actually wins jobs on Upwork — personalized first lines, a specific deliverable matching the brief, a fast turnaround promise, one clear CTA, no generic filler — and you write like the top 1% of earners, not a template bot. Out of every 10 pitches you write, the goal is that at least 1 converts into a hired job, so every pitch must read as genuinely tailored to THIS client, not copy-pasted.

CLIENT (extracted from their job post):
- First name: ${client.firstName || '(unknown — address as "there")'}
- Company: ${client.company || '(unknown)'}
- Location: ${client.location || '(unknown)'}
- Role: ${client.role || '(unknown)'}
- Pain points: ${client.painPoints || '(infer from the brief)'}
- Their tone: ${client.tone || 'neutral'}

JOB BRIEF: """${jobText.slice(0, 2000)}"""

FREELANCER (the sender):
- Name: ${pf.name || '[Your name]'}
- Headline: ${pf.head || 'AI UGC creator'}
- Offer: ${pf.offer || 'AI-generated UGC & product-ad videos, 24-48h turnaround, $50-$200 per video, unlimited revisions'}
- Portfolio link: ${pf.port || ''}

SAVED PORTFOLIO PROJECTS:
${projList}
${pinnedProject ? `\nThe freelancer manually picked this project to feature: "${pinnedProject.title}" — ${pinnedProject.desc || ''}` : ''}
${extra ? `\nExtra to weave in naturally: ${extra}` : ''}

Do TWO things and return ONLY valid minified JSON (no prose, no markdown):

1. projectSuggestion: one short sentence. If a saved project fits this job well, name it and say why. If NONE fit well (or none are saved), suggest the KIND of portfolio project they should create for jobs like this (e.g. "Create a skincare-brand UGC sample — you don't have one and skincare jobs like this come up often").
2. pitches: all 6, each written as if freshly written for this specific client — reference their actual need, never generic.

Return JSON shaped EXACTLY:
{"projectSuggestion":"",
"pitches":{"upwork":"","linkedin":"","invite":"","whatsapp":"","instagram":"","email":""}}

Pitch rules:
- upwork: a full Upwork proposal. Open with a line that proves you read THEIR specific brief (not "I hope this finds you well"). State the specific deliverable, a concrete turnaround time, and one clear next step. Reference the featured project/sample if there is one. Under 180 words. No generic filler like "I am a hardworking professional."
- linkedin: a longer, professional DM — under 200 words — for reaching them off-platform. Reference their company/need specifically.
- invite: a LinkedIn connection note, UNDER 200 characters, casual but purposeful.
- whatsapp: under 70 words, casual, first-person, like a real message not an ad.
- instagram: under 70 words, casual DM tone, can use 1 emoji.
- email: include a "Subject:" line then the body. Friendly, under 170 words, end with a soft offer to send a free sample.
- Address the client by first name if known, else "there". Never invent a fake email, phone number or fact not given above.
- Match ${client.tone ? `their tone (${client.tone})` : 'a warm, professional tone'} where it fits the channel.
- Output JSON ONLY.`;

    const writeRaw = await callModel(MODEL_WRITE, writePrompt);
    const data = parseJSON(writeRaw);
    if (!data || !data.pitches) return resp(502, { error: 'AI did not return usable output. Try again.', raw: writeRaw.slice(0, 300) });

    return resp(200, { ok: true, client, projectSuggestion: data.projectSuggestion || '', pitches: data.pitches });
  } catch (e) {
    return resp(500, { error: (e && e.message) || 'pitch-ai failed' });
  }
};

function resp(statusCode, b) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) };
}
