// ============================================================
// POST /.netlify/functions/audio-generate   (Audio Studio — voiceover/narration)
// Body: { text, voice_sample_url, speed? }
// Standalone text-to-speech using WaveSpeed's Omnivoice voice-clone model —
// the same one driving the Avatar Creator's narration, exposed here on its
// own so a script can become a ready-to-use voiceover without training a
// full avatar. voice_sample_url is a short (3-10s) reference clip; every
// call re-supplies it, so there's no separate "create voice" step.
// Async submit + poll via job-status.js (kind:'audio' falls through to the
// generic video/image completion branch, saved into `generations`).
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { audioCredits, estimateScriptMinutes } = require('./_packs');
const { submitSpeech } = require('./_providers');

const MODEL = 'omnivoice-voice-clone';

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.WAVESPEED_KEY) return json(503, { error: 'Audio Studio is being connected (WAVESPEED_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const text = (body.text || '').trim();
    const voiceSampleUrl = (body.voice_sample_url || '').trim();
    const speed = body.speed || 1;
    if (!text) return json(400, { error: 'Write the script first.' });
    if (!voiceSampleUrl) return json(400, { error: 'Add a voice sample (upload one, or pick a trained avatar\'s voice).' });

    db = admin();
    const minutes = estimateScriptMinutes(text);
    cost = audioCredits(minutes);
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const { requestId } = await submitSpeech({ audio: voiceSampleUrl, text, speed });
    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'audio', model: MODEL, prompt: text, credits: cost, status: 'processing' });
    return json(200, { request_id: requestId, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start audio generation', refunded: cost });
  }
};
