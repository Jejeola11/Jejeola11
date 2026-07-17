// ============================================================
// POST /.netlify/functions/audio-rewrite   (Audio Studio — "make it human")
// Body: { text }
// Rewrites a plain script into a Resemble-ready PERFORMANCE script — same
// words, same meaning, but with Resemble's own supported delivery markup
// (confirmed live against docs.resemble.ai/getting-started/ssml 2026-07-17)
// inserted where a real person would naturally pause, breathe, or land
// emphasis. This is Resemble-specific markup (bracket tags like [pause],
// wrapping tags like <emphasis>) — it must NEVER be sent through
// WaveSpeed's Omnivoice, which would just read the literal tag text aloud.
// Free — a lightweight text transform over a script already being paid for
// at the actual voice-generation step, not a generation itself.
// Uses the same MuAPI Claude wrapper as flyer-brief.js's design assistant.
// ============================================================
const { getUser, json } = require('./_supabase');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PROMPT = `You rewrite scripts into performance-ready text for Resemble AI's text-to-speech engine, so the spoken result sounds like a real, warm, human delivery instead of a flat read.

Resemble supports exactly these delivery tags — use ONLY these, nothing invented:
Inline (insert alone, no closing tag): [pause] [long-pause] [breath] [inhale] [exhale] [sigh] [laugh] [chuckle]
Wrapping (open + close around a word or phrase): <emphasis>...</emphasis> <slow>...</slow> <fast>...</fast> <soft>...</soft> <loud>...</loud>

Rules:
- Keep every word of the original meaning intact — you are adding delivery markup and natural punctuation, never rewriting the message, never adding new claims or sentences.
- Insert [pause] at natural breath points (after a strong statement, before a pivot, before a key reveal) and [long-pause] only at a genuine dramatic beat — use both sparingly, a script drowning in tags reads as fake, not human.
- Wrap the 1-3 most important words per sentence in <emphasis> — the words that would actually get vocal stress if a real person said this out loud (numbers, the core claim, the call to action) — not every sentence needs one.
- Use <slow> only on a genuinely important phrase that deserves weight, <fast> only where energy should visibly pick up.
- Do not add [breath]/[sigh] more than once or twice in a short script — overuse sounds theatrical, not human.
- Preserve line breaks/paragraph structure from the input.
- Output ONLY the rewritten script text with tags inserted. No explanation, no preamble, no markdown fencing, nothing else.`;

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'This is being connected (MUAPI_KEY missing).' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const text = (body.text || '').trim();
    if (!text) return json(400, { error: 'Write the script first.' });

    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${SYSTEM_PROMPT}\n\nSCRIPT TO REWRITE:\n${text}` }),
    });
    const j = await sub.json().catch(() => ({}));
    if (!sub.ok) throw new Error((j && (j.error || j.message)) || `Engine HTTP ${sub.status}`);

    const raw = j.output_text || j.text || (Array.isArray(j.output) && j.output.map((o) => o.content || o.text).join('')) || j.content;
    if (raw) return json(200, { text: String(raw).trim() });

    // Some MuAPI text models return an async request_id instead of the text
    // immediately — poll once here (a rewrite this short finishes fast) so
    // the frontend doesn't need its own polling logic for this one call.
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not return text or a job id.');
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
      if (p.status === 'completed') {
        const out = (p.outputs && p.outputs[0]) || p.output_text || p.text;
        if (out) return json(200, { text: String(out).trim() });
        throw new Error('Engine returned no text.');
      }
      if (p.status === 'failed' || p.status === 'cancelled') throw new Error('Rewrite failed.');
    }
    throw new Error('Still working — try again in a moment.');
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not rewrite the script.' });
  }
};
