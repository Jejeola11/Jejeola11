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
// Uses the same WaveSpeed LLM endpoint as flyer-brief.js's design assistant.
// ============================================================
const { getUser, json } = require('./_supabase');
const { chatCompletion, hasWaveSpeed } = require('./_providers');

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
    if (!hasWaveSpeed()) return json(503, { error: 'This is being connected (WAVESPEED_KEY missing).' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const text = (body.text || '').trim();
    if (!text) return json(400, { error: 'Write the script first.' });

    const rewritten = await chatCompletion({ prompt: `${SYSTEM_PROMPT}\n\nSCRIPT TO REWRITE:\n${text}` });
    return json(200, { text: rewritten.trim() });
  } catch (e) {
    return json(502, { error: (e && e.message) || 'Could not rewrite the script.' });
  }
};
