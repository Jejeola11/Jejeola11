// ============================================================
// Shared pipeline logic for the AI Avatar Creator (long-form video).
//   Used by both avatar-video-create.js (kicks the pipeline off) and
//   avatar-video-status.js (the browser polls this every few seconds).
//   advance() does exactly ONE bounded unit of work per call — one remote
//   submit, one remote poll, or one local ffmpeg pass — so every invocation
//   stays fast regardless of how long the finished video will be. That's
//   what makes this "fully automated": the user's own poll loop IS the
//   heartbeat that drives the pipeline through every stage, with zero
//   manual chunk-triggering and no separate background/cron function.
//
// Stages: speech -> slicing -> video -> stitching -> complete (or failed)
//   speech    — Omnivoice batches (parallel submit, poll to completion),
//               concatenated into ONE continuous narration track. Generating
//               the whole script's speech in a single pass (just split into
//               parallel API calls, never regenerated per video chunk) is
//               what avoids the voice-tone drift real users report when a
//               TTS engine is re-invoked separately for every segment.
//   slicing   — local only: cut that track into CHUNK_SECONDS-long segments,
//               one per eventual video chunk.
//   video     — InfiniteTalk chunks, STRICTLY sequential (chunk N+1 needs
//               chunk N's last frame as its start image — the "chained
//               end-frame" mechanism that keeps a long video looking
//               continuous instead of resetting to the master photo every
//               few minutes).
//   stitching — local only: concatenate the finished video chunks (each
//               already has audio baked in from InfiniteTalk).
// ============================================================
const { submitAvatar, submitSpeech, pollAny } = require('./_providers');
const {
  ensureWorkDir, cleanupTmp, downloadToFile, probeDuration,
  extractLastFrame, sliceAudio, concatAudio, concatVideos, uploadToStorage,
} = require('./_ffmpeg');

const path = require('path');

// InfiniteTalk's documented hard cap is ~10 minutes per generation; we stay
// well under it so a chunk never gets silently truncated.
const CHUNK_SECONDS = 8 * 60;
// Comfortably under the ~6,180-char length we confirmed WaveSpeed accepts at
// submit time for a single omnivoice/voice-clone call.
const SPEECH_BATCH_CHARS = 3000;

// Split a script into batches at sentence boundaries, each <= maxChars. A
// single sentence longer than maxChars is hard-split (rare, but must not
// throw).
function splitScript(script, maxChars = SPEECH_BATCH_CHARS) {
  const sentences = script.replace(/\s+/g, ' ').trim().match(/[^.!?]+[.!?]*\s*/g) || [script];
  const batches = [];
  let cur = '';
  for (const s of sentences) {
    if ((cur + s).length > maxChars && cur) { batches.push(cur.trim()); cur = ''; }
    if (s.length > maxChars) {
      // one giant sentence — hard-split it
      for (let i = 0; i < s.length; i += maxChars) batches.push(s.slice(i, i + maxChars).trim());
      continue;
    }
    cur += s;
  }
  if (cur.trim()) batches.push(cur.trim());
  return batches.filter(Boolean);
}

async function refundAndFail(db, video, message) {
  try { if (video.credits) await db.rpc('add_credits', { uid: video.user_id, amount: video.credits, why: 'refund' }); } catch (e) {}
  await db.from('avatar_videos').update({ stage: 'failed', error_message: message, updated_at: new Date().toISOString() }).eq('id', video.id);
  await cleanupTmp(video.id);
}

async function touchRunning(db, video) {
  await db.from('avatar_videos').update({ updated_at: new Date().toISOString() }).eq('id', video.id);
}

// ---- stage: speech ---------------------------------------------------------
async function advanceSpeech(db, video, avatar) {
  const { data: rows } = await db.from('avatar_video_chunks').select('*').eq('avatar_video_id', video.id).eq('kind', 'speech').order('seq');

  if (!rows || !rows.length) {
    const batches = splitScript(video.script);
    const inserted = [];
    for (let seq = 0; seq < batches.length; seq++) {
      const { data } = await db.from('avatar_video_chunks').insert({ avatar_video_id: video.id, kind: 'speech', seq, status: 'pending' }).select().single();
      inserted.push({ row: data, text: batches[seq] });
    }
    // Independent batches — submit them all in parallel.
    await Promise.all(inserted.map(async ({ row, text }) => {
      try {
        const { requestId } = await submitSpeech({ audio: avatar.voice_sample_url, text, speed: (video.settings && video.settings.speed) || 1 });
        await db.from('avatar_video_chunks').update({ request_id: requestId, status: 'processing' }).eq('id', row.id);
      } catch (e) {
        await db.from('avatar_video_chunks').update({ status: 'failed' }).eq('id', row.id);
      }
    }));
    await touchRunning(db, video);
    return { stage: 'speech', progress: `0/${batches.length}` };
  }

  const pending = rows.filter((r) => r.status === 'processing');
  if (pending.length) {
    await Promise.all(pending.map(async (r) => {
      let res;
      try { res = await pollAny(r.request_id); } catch (e) { return; }
      if (res.status === 'completed' && res.url) {
        await db.from('avatar_video_chunks').update({ status: 'completed', output_url: res.url }).eq('id', r.id);
      } else if (res.status === 'failed') {
        await db.from('avatar_video_chunks').update({ status: 'failed' }).eq('id', r.id);
      }
    }));
  }

  const { data: fresh } = await db.from('avatar_video_chunks').select('*').eq('avatar_video_id', video.id).eq('kind', 'speech').order('seq');
  if (fresh.some((r) => r.status === 'failed')) {
    await refundAndFail(db, video, 'Voice generation failed for part of the script.');
    return { stage: 'failed' };
  }
  const done = fresh.filter((r) => r.status === 'completed');
  if (done.length < fresh.length) {
    await touchRunning(db, video);
    return { stage: 'speech', progress: `${done.length}/${fresh.length}` };
  }

  // All batches done — stitch into one continuous narration track.
  const dir = await ensureWorkDir(video.id);
  const localPaths = [];
  for (const r of fresh) {
    const p = path.join(dir, `speech-${r.seq}.m4a`);
    await downloadToFile(r.output_url, p);
    localPaths.push(p);
  }
  const joined = path.join(dir, 'speech-full.m4a');
  await concatAudio(localPaths, joined, video.id);
  const duration = await probeDuration(joined);
  const speechUrl = await uploadToStorage(db, joined, `${video.user_id}/avvid-${video.id}-speech.m4a`, 'audio/mp4');

  await db.from('avatar_videos').update({ stage: 'slicing', speech_url: speechUrl, total_duration_sec: duration, updated_at: new Date().toISOString() }).eq('id', video.id);
  return { stage: 'slicing', progress: 'preparing chunks' };
}

// ---- stage: slicing (local, one-shot) --------------------------------------
async function advanceSlicing(db, video) {
  const dir = await ensureWorkDir(video.id);
  const local = path.join(dir, 'speech-full.m4a');
  await downloadToFile(video.speech_url, local);
  const total = video.total_duration_sec || await probeDuration(local);
  const n = Math.max(1, Math.ceil(total / CHUNK_SECONDS));

  for (let seq = 0; seq < n; seq++) {
    const startSec = seq * CHUNK_SECONDS;
    const durSec = Math.min(CHUNK_SECONDS, total - startSec);
    const outPath = path.join(dir, `audio-chunk-${seq}.m4a`);
    await sliceAudio(local, startSec, durSec, outPath);
    const url = await uploadToStorage(db, outPath, `${video.user_id}/avvid-${video.id}-audio-${seq}.m4a`, 'audio/mp4');
    await db.from('avatar_video_chunks').insert({
      avatar_video_id: video.id, kind: 'video', seq, status: 'pending',
      input_audio_url: url, start_sec: startSec, duration_sec: durSec,
    });
  }

  await db.from('avatar_videos').update({ stage: 'video', updated_at: new Date().toISOString() }).eq('id', video.id);
  return { stage: 'video', progress: `0/${n}` };
}

// ---- stage: video (sequential, frame-chained) ------------------------------
async function advanceVideo(db, video, avatar) {
  const { data: rows } = await db.from('avatar_video_chunks').select('*').eq('avatar_video_id', video.id).eq('kind', 'video').order('seq');
  const next = rows.find((r) => r.status !== 'completed');

  if (!next) {
    await db.from('avatar_videos').update({ stage: 'stitching', updated_at: new Date().toISOString() }).eq('id', video.id);
    return { stage: 'stitching', progress: 'combining chunks' };
  }

  if (next.status === 'failed') {
    await refundAndFail(db, video, `Video generation failed on part ${next.seq + 1}.`);
    return { stage: 'failed' };
  }

  if (!next.request_id) {
    const masterFrame = (video.settings && video.settings.start_image) || avatar.trained_frame_url || avatar.model_sheet_url || avatar.image_url;
    const refImage = next.seq === 0 ? masterFrame : (rows[next.seq - 1] && rows[next.seq - 1].last_frame_url) || masterFrame;
    const prompt = (video.settings && video.settings.prompt) || '';
    try {
      const { requestId } = await submitAvatar('infinitetalk', {
        image: refImage, audio: next.input_audio_url, prompt,
        resolution: (video.settings && video.settings.resolution) || '480p',
      });
      await db.from('avatar_video_chunks').update({ request_id: requestId, status: 'processing', source_frame_url: refImage }).eq('id', next.id);
    } catch (e) {
      await refundAndFail(db, video, e.message || 'Could not start video generation.');
      return { stage: 'failed' };
    }
    await touchRunning(db, video);
    return { stage: 'video', progress: `${next.seq}/${rows.length}` };
  }

  let res;
  try { res = await pollAny(next.request_id); } catch (e) { return { stage: 'video', progress: `${next.seq}/${rows.length}` }; }
  if (res.status === 'failed') {
    await db.from('avatar_video_chunks').update({ status: 'failed' }).eq('id', next.id);
    await refundAndFail(db, video, `Video generation failed on part ${next.seq + 1}.`);
    return { stage: 'failed' };
  }
  if (res.status !== 'completed' || !res.url) {
    await touchRunning(db, video);
    return { stage: 'video', progress: `${next.seq}/${rows.length}` };
  }

  const dir = await ensureWorkDir(video.id);
  const localVideo = path.join(dir, `video-chunk-${next.seq}.mp4`);
  await downloadToFile(res.url, localVideo);
  const framePath = path.join(dir, `frame-${next.seq}.png`);
  await extractLastFrame(localVideo, framePath);
  const frameUrl = await uploadToStorage(db, framePath, `${video.user_id}/avvid-${video.id}-frame-${next.seq}.png`, 'image/png');

  await db.from('avatar_video_chunks').update({ status: 'completed', output_url: res.url, last_frame_url: frameUrl }).eq('id', next.id);
  return { stage: 'video', progress: `${next.seq + 1}/${rows.length}` };
}

// ---- stage: stitching (local, one-shot) ------------------------------------
async function advanceStitching(db, video) {
  const { data: rows } = await db.from('avatar_video_chunks').select('*').eq('avatar_video_id', video.id).eq('kind', 'video').order('seq');
  const dir = await ensureWorkDir(video.id);
  const localPaths = [];
  for (const r of rows) {
    const p = path.join(dir, `final-chunk-${r.seq}.mp4`);
    await downloadToFile(r.output_url, p);
    localPaths.push(p);
  }
  const outPath = path.join(dir, 'final.mp4');
  await concatVideos(localPaths, outPath, video.id);
  const finalUrl = await uploadToStorage(db, outPath, `${video.user_id}/avvid-${video.id}-final.mp4`, 'video/mp4');

  await db.from('avatar_videos').update({ stage: 'complete', output_url: finalUrl, updated_at: new Date().toISOString() }).eq('id', video.id);
  await cleanupTmp(video.id);
  return { stage: 'complete', url: finalUrl };
}

// Does ONE bounded unit of pipeline work for this avatar_video row and
// returns its current progress. Safe to call repeatedly (idempotent per
// stage) — that's the entire "automation" mechanism.
async function advance(db, videoId) {
  const { data: video } = await db.from('avatar_videos').select('*').eq('id', videoId).maybeSingle();
  if (!video) throw new Error('Video not found');
  if (video.stage === 'complete') return { stage: 'complete', url: video.output_url };
  if (video.stage === 'failed') return { stage: 'failed', error: video.error_message };

  const { data: avatar } = await db.from('avatars').select('*').eq('id', video.avatar_id).maybeSingle();
  if (!avatar) { await refundAndFail(db, video, 'Avatar not found.'); return { stage: 'failed' }; }

  try {
    if (video.stage === 'speech') return await advanceSpeech(db, video, avatar);
    if (video.stage === 'slicing') return await advanceSlicing(db, video);
    if (video.stage === 'video') return await advanceVideo(db, video, avatar);
    if (video.stage === 'stitching') return await advanceStitching(db, video);
  } catch (e) {
    await refundAndFail(db, video, e.message || 'Pipeline error.');
    return { stage: 'failed', error: e.message };
  }
  return { stage: video.stage };
}

module.exports = { advance, splitScript, CHUNK_SECONDS, SPEECH_BATCH_CHARS };
