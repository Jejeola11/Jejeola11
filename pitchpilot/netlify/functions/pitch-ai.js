// ============================================================
// POST /.netlify/functions/pitch-ai
// Body: { jobText, profile, project, extra, contacts }
// Uses Claude Haiku (via your MuAPI key) to (1) read the pasted job and extract
// the client details, and (2) write the full set of pitches. Returns structured JSON.
// Requires env var: MUAPI_KEY  (set it in this site's Netlify env).
// ============================================================
const MUAPI = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-haiku-4-5';

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
    const pf = body.profile || {};
    const pj = body.project || null;
    const extra = (body.extra || '').slice(0, 600);

    const prompt =
`You are an expert freelance pitch writer. Read the JOB POST below and do TWO things, returning ONLY valid minified JSON (no prose, no markdown).

JOB POST:
"""${jobText}"""

ABOUT THE FREELANCER (use as the sender):
- Name: ${pf.name || '[Your name]'}
- Headline: ${pf.head || 'AI UGC creator'}
- Offer: ${pf.offer || 'AI-generated UGC & product-ad videos, 24-48h turnaround, $50-$200 per video, unlimited revisions'}
- Portfolio: ${pf.port || ''}
${pj ? `- Most relevant past project to feature: "${pj.title}" — ${pj.desc || ''}${pj.link ? ' (' + pj.link + ')' : ''}` : ''}
${extra ? `- Extra to weave in naturally: ${extra}` : ''}

Return JSON shaped EXACTLY:
{"client":{"firstName":"","company":"","location":"","role":"","summary":""},
"pitches":{"email":"","whatsapp":"","instagram":"","linkedin":"","invite":""}}

Rules:
- client.firstName = the client's first name if findable in the post/feedback, else "".
- client.company = their brand/company if stated, else "".
- client.location = their country/city if stated, else "".
- email: include "Subject:" line then body, friendly, under 170 words, reference the freelancer's project if given, end with a soft offer to send a free sample.
- whatsapp & instagram: under 70 words, casual, first-person.
- linkedin: professional, under 200 words.
- invite: a LinkedIn connection note UNDER 200 characters.
- Address the client by first name if known, else "there". Never invent a fake email or contact.
- Output JSON ONLY.`;

    const raw = await claude(prompt);
    const data = parseJSON(raw);
    if (!data || !data.pitches) return resp(502, { error: 'AI did not return usable output. Try again.', raw: raw.slice(0, 300) });
    return resp(200, { ok: true, client: data.client || {}, pitches: data.pitches });
  } catch (e) {
    return resp(500, { error: (e && e.message) || 'pitch-ai failed' });
  }
};

function resp(statusCode, b) {
  return { statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b) };
}
