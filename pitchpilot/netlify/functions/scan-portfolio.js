// ============================================================
// POST /.netlify/functions/scan-portfolio   (auth required, free — doesn't spend a use)
// { links: { upwork, behance, drive, website, other } }
// Fetches whichever public links the freelancer gave (Upwork profile,
// Behance, a Google Drive share link, their own site, anything else),
// pulls the visible text off each page, and asks Claude to turn that into
// a short profile: what they actually offer, who their ideal client is,
// and good Lead Finder search terms (niche + the kind of business that
// needs this). That profile pre-fills the Lead Finder's target-criteria
// step so the freelancer doesn't have to type it all in by hand.
//
// Pages that need a login (most Drive folders, some Behance privacy
// settings) will come back mostly blank — that's expected, not a bug;
// the freelancer can just fill in anything that didn't come through.
// Env needed: MUAPI_KEY (same key pitch-ai.js already uses).
// ============================================================
const { getUser, json } = require('./_pp');

const MUAPI = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-sonnet-4-5';

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchText(url) {
  if (!url) return '';
  try {
    const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const res = await fetch(withProtocol, { redirect: 'follow' });
    if (!res.ok) return '';
    const html = await res.text();
    return stripHtml(html).slice(0, 4000);
  } catch (e) {
    return '';
  }
}

function extractText(p) {
  if (!p) return '';
  if (typeof p.output === 'string') return p.output;
  if (typeof p.text === 'string') return p.text;
  if (typeof p.result === 'string') return p.result;
  if (Array.isArray(p.outputs) && p.outputs.length) return String(p.outputs[0]);
  if (p.choices && p.choices[0] && p.choices[0].message) return p.choices[0].message.content;
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
  for (let i = 0; i < 20 && !text && id; i++) {
    await sleep(1500);
    const p = await (await fetch(`${MUAPI}/predictions/${id}/result`, { headers: { 'x-api-key': key } })).json();
    if (p.status === 'failed' || p.status === 'cancelled') throw new Error('AI ' + p.status);
    text = extractText(p);
    if (p.status === 'completed' && !text) break;
  }
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

  let body;
  try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const links = body.links || {};
  const pulled = await Promise.all([
    fetchText(links.upwork), fetchText(links.behance), fetchText(links.drive), fetchText(links.website), fetchText(links.other),
  ]);
  const [upworkTxt, behanceTxt, driveTxt, websiteTxt, otherTxt] = pulled;
  const anyText = [upworkTxt, behanceTxt, driveTxt, websiteTxt, otherTxt].some(Boolean);
  if (!anyText) return json(400, { error: 'Could not read anything from those links — check they\'re public, or just fill in your profile by hand.' });

  try {
    const prompt =
`You are helping a freelancer set up their outreach profile from their real portfolio pages. Below is the raw visible text pulled from whichever links they gave you (some may be empty — that's fine, work with what's there).

UPWORK PROFILE TEXT: """${upworkTxt || '(none / not accessible)'}"""
BEHANCE TEXT: """${behanceTxt || '(none / not accessible)'}"""
GOOGLE DRIVE TEXT: """${driveTxt || '(none / not accessible)'}"""
WEBSITE TEXT: """${websiteTxt || '(none / not accessible)'}"""
OTHER LINK TEXT: """${otherTxt || '(none / not accessible)'}"""

Return ONLY valid minified JSON (no prose, no markdown):
{"headline":"","offer":"","idealClient":"","searchTerms":["",""]}

Rules:
- headline: a short "what you do" line, e.g. "AI product photography & UGC ads for skincare brands".
- offer: one sentence describing the concrete deliverable + rough price range if you can infer one, else a sensible freelance-market range for this kind of work.
- idealClient: 1-2 sentences on the type of business that most needs this (industry, size, what's missing that they'd fix).
- searchTerms: 2-4 short Google-Maps-style search phrases this freelancer should use in Lead Finder (e.g. "hair salons", "boutique hotels"), based on who their portfolio shows they're best suited to serve.
- Never invent specific numbers, clients, or facts not implied by the text above.`;

    const raw = await claude(prompt);
    const data = parseJSON(raw);
    if (!data) return json(502, { error: 'Could not summarize your portfolio — tap again.' });
    return json(200, { ok: true, profile: data });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'scan-portfolio failed' });
  }
};
