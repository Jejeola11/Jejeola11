// ============================================================
// POST /.netlify/functions/audio-generate   (Audio Studio — voiceover/narration)
// Body: { text, voice_sample_url, speed?, reference_text?, engine?, resemble_voice_uuid? }
// Standalone text-to-speech, two engines:
//   engine: 'wavespeed' (default) — WaveSpeed's Omnivoice voice-clone model,
//     the same one driving the Avatar Creator's narration. voice_sample_url
//     is a reference clip (15-30s of clear, expressive speech is the
//     accurate range — every call re-supplies it, no separate "create
//     voice" step). reference_text is the exact transcript of that clip,
//     optional but confirmed by WaveSpeed's docs to meaningfully improve
//     accent/timbre accuracy.
//     Async submit + poll via job-status.js (kind:'audio' falls through to
//     the generic completion branch, saved into `generations`).
//   engine: 'resemble' — a second, higher-fidelity option using a voice
//     already trained once in Resemble's own dashboard (resemble_voice_uuid
//     identifies which one — see resemble-voices.js for the picker list).
//     Resemble's /synthesize call IS synchronous, but doing the actual
//     synth-and-upload work inside THIS request risks tripping Netlify's
//     own function execution timeout (cold start + the real API call +
//     the storage upload, all in one request/response, has no safety
//     margin the way every other async job in this app has) — so this just
//     inserts a pending job and returns immediately; job-status.js does the
//     real work lazily on its first poll (see the "resemble:" model-prefix
//     branch there), same "user's own poll loop is the heartbeat" pattern
//     as everything else in this app.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { audioCredits, estimateScriptMinutes } = require('./_packs');
const { submitSpeech } = require('./_providers');

const MODEL = 'omnivoice-voice-clone';

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const text = (body.text || '').trim();
    const speed = body.speed || 1;
    const engine = body.engine === 'resemble' ? 'resemble' : 'wavespeed';
    if (!text) return json(400, { error: 'Write the script first.' });

    db = admin();
    const minutes = estimateScriptMinutes(text);
    cost = audioCredits(minutes);

    if (engine === 'resemble') {
      if (!process.env.RESEMBLE_API_KEY) return json(503, { error: 'Resemble voice is being connected (RESEMBLE_API_KEY missing).' });
      const voiceUuid = (body.resemble_voice_uuid || '').trim();
      if (!voiceUuid) return json(400, { error: 'Pick a Resemble voice.' });

      const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
      if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

      const requestId = 'resemble-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'audio', model: `resemble:${voiceUuid}`, prompt: text, credits: cost, status: 'processing' });
      return json(200, { request_id: requestId, credits: balance });
    }

    if (!process.env.WAVESPEED_KEY) return json(503, { error: 'Audio Studio is being connected (WAVESPEED_KEY missing).' });
    const voiceSampleUrl = (body.voice_sample_url || '').trim();
    const referenceText = (body.reference_text || '').trim();
    if (!voiceSampleUrl) return json(400, { error: 'Add a voice sample (upload one, or pick a trained avatar\'s voice).' });

    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const { requestId } = await submitSpeech({ audio: voiceSampleUrl, text, speed, referenceText });
    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'audio', model: MODEL, prompt: text, credits: cost, status: 'processing' });
    return json(200, { request_id: requestId, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start audio generation', refunded: cost });
  }
};
