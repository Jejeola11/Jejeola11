// ============================================================
// POST /.netlify/functions/video-transcribe   (Video Editing Studio)
// Body: { project_id?, video_url }
// Extracts the audio track and transcribes it via MuAPI's openai-whisper
// (confirmed live: standard OpenAI-compatible fields — audio_url,
// response_format, timestamp_granularities) with word-level timestamps,
// so captions can be synced precisely. Async submit + poll via
// job-status.js (kind:'video-transcribe'), which saves the parsed
// transcript onto video_edit_projects.transcript on completion.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { ensureWorkDir, cleanupTmp, downloadToFile, ffmpeg, uploadToStorage } = require('./_ffmpeg');
const { muapiHostFile } = require('./_muapi');
const path = require('path');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'openai-whisper';
const TRANSCRIBE_COST = 3;

exports.handler = async (event) => {
  let db, user, cost = 0, jobId;
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
    if (!process.env.MUAPI_KEY) return json(503, { error: 'Editing Studio is being connected (MUAPI_KEY missing).' });

    user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const videoUrl = (body.video_url || '').trim();
    if (!videoUrl) return json(400, { error: 'Missing video_url' });

    db = admin();
    let projectId = body.project_id;
    if (projectId) {
      const { data: existing } = await db.from('video_edit_projects').select('id, user_id').eq('id', projectId).maybeSingle();
      if (!existing || existing.user_id !== user.id) return json(404, { error: 'Project not found.' });
    } else {
      const { data: newProj } = await db.from('video_edit_projects').insert({ user_id: user.id, source_video_url: videoUrl }).select().single();
      projectId = newProj && newProj.id;
    }

    cost = TRANSCRIBE_COST;
    const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
    if (balance === null) return json(402, { error: 'Not enough credits.', need: cost, code: 'NO_CREDITS' });

    jobId = 'transcribe-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const dir = await ensureWorkDir(jobId);
    const localVideo = path.join(dir, 'in.mp4');
    await downloadToFile(videoUrl, localVideo);
    const audioPath = path.join(dir, 'audio.mp3');
    await ffmpeg(['-y', '-i', localVideo, '-vn', '-acodec', 'libmp3lame', '-q:a', '2', audioPath]);
    const audioUrl = await uploadToStorage(db, audioPath, `${user.id}/transcribe-${Date.now()}.mp3`, 'audio/mpeg');
    // Re-host on MuAPI's own CDN — Supabase storage URLs aren't always
    // reachable by MuAPI directly (see _muapi.js).
    const hostedAudioUrl = await muapiHostFile(audioUrl, 'audio');
    await cleanupTmp(jobId);

    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ audio_url: hostedAudioUrl, response_format: 'verbose_json', timestamp_granularities: ['word'] }),
    });
    const txt = await sub.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!sub.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not start the job');

    await db.from('jobs').insert({ request_id: id, user_id: user.id, kind: 'video-transcribe', model: MODEL, prompt: videoUrl, credits: cost, status: 'processing', project_id: projectId });
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { if (jobId) await cleanupTmp(jobId); } catch (_) {}
    try { if (db && user && cost) await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: (e && e.message) || 'Could not start transcription', refunded: cost });
  }
};
