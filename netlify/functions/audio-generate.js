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
//     Resemble's /synthesize call is genuinely SYNCHRONOUS (audio comes
//     back in the same request), so this branch does the whole
//     synth-and-upload right here and returns the finished url directly —
//     no request_id, no polling.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { audioCredits, estimateScriptMinutes } = require('./_packs');
const { submitSpeech, synthesizeResemble } = require('./_providers');

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

      const { base64, format } = await synthesizeResemble({ text, voiceUuid });
      const buf = Buffer.from(base64, 'base64');
      const path = `${user.id}/resemble-${Date.now()}.${format}`;
      const { error: upErr } = await db.storage.from('avatars').upload(path, buf, { contentType: `audio/${format}`, upsert: true });
      if (upErr) throw new Error(upErr.message);
      const url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl;

      await db.from('jobs').insert({ request_id: 'resemble-' + Date.now(), user_id: user.id, kind: 'audio', model: 'resemble', prompt: text, credits: cost, status: 'completed', output_url: url });
      try { await db.from('generations').insert({ user_id: user.id, type: 'audio', model: 'resemble', prompt: text, output_url: url, credits_spent: cost }); } catch (e) {}
      return json(200, { done: true, url, credits: balance });
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
