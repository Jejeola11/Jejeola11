// ============================================================
// POST /.netlify/functions/lipsync-dialogue   (Omni Studio — Lip-Sync Dialogue)
// Body: { video_url, mode: 'text'|'audio', text?, voice_language?, voice_speed?,
//         audio_url?, duration_sec? }
// Dubs real, lip-synced speech onto an EXISTING video (from Video Studio,
// Avatar Creator, anywhere) via Kling's dedicated lip-sync models — a
// second pass, not a fresh generation. 'text' mode uses Kling's own
// built-in TTS from a typed script (fast, one step); 'audio' mode syncs
// against a real uploaded/generated audio clip (more control, e.g. a
// Fuse Studio Audio Studio voice line) — that's the on/off toggle the UI
// exposes. Async submit -> poll via the shared job-status.js (kind:'video').
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { lipsyncDialogueCredits } = require('./_packs');
const { submitLipsyncDialogue, hasWaveSpeed } = require('./_providers');

exports.handler = async (event) => {
  let db, user, cost = 0;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!hasWaveSpeed()) return json(503, { error: 'Lip-Sync Dialogue is being connected (WAVESPEED_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const video_url = (body.video_url || '').trim();
    const mode = body.mode === 'audio' ? 'audio' : 'text';
    if (!video_url) return json(400, { error: 'Add the video you want to add dialogue to.' });
    if (mode === 'text' && !(body.text || '').trim()) return json(400, { error: 'Write the line you want spoken.' });
    if (mode === 'audio' && !(body.audio_url || '').trim()) return json(400, { error: 'Add an audio clip.' });

    db = admin();
    cost = lipsyncDialogueCredits(mode, body.duration_sec);
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    const { requestId } = await submitLipsyncDialogue({
      video: video_url,
      mode,
      text: body.text,
      voice_language: body.voice_language,
      voice_speed: body.voice_speed,
      audio: body.audio_url,
    });

    await db.from('jobs').insert({ request_id: requestId, user_id: user.id, kind: 'video', model: `kling-lipsync-${mode}`, prompt: mode === 'text' ? body.text : '(lip-sync dialogue)', aspect: '9:16', credits: cost, status: 'processing' });
    return json(200, { request_id: requestId, credits: balance });
  } catch (e) {
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start lip-sync', refunded: cost });
  }
};
