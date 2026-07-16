// ============================================================
// Multi-provider router for video + avatar generation.
//   Routes each job to the cheapest verified provider, with graceful
//   fallback to MuAPI when a provider key is missing. The provider is
//   encoded as a prefix on the request_id ("ws:" for WaveSpeed) so the
//   poller knows who to ask — ZERO database migration required, and old
//   bare MuAPI ids keep working untouched.
//
//   IMPORTANT: this file changes WHERE a job runs, never what the user
//   is charged. Credit pricing stays in _packs.js. WaveSpeed's real cost
//   is far lower than MuAPI's (Seedance -60/-80%, Kling -40/-50%), so the
//   margin per credit grows — that's the whole point of the migration.
//   Deploy is safe: with no WAVESPEED_KEY set, every route falls back to
//   MuAPI and behaviour is identical to before.
//
//   API formats verified 2026-07-15 against wavespeed.ai/docs:
//     submit: POST https://api.wavespeed.ai/api/v3/{model}
//             header Authorization: Bearer <key>;  returns data.id
//     poll:   GET  https://api.wavespeed.ai/api/v3/predictions/{id}/result
//             returns data.status (created|processing|completed|failed)
//             and data.outputs (array of URLs)
// ============================================================
const MU_BASE = 'https://api.muapi.ai/api/v1';
const WS_BASE = 'https://api.wavespeed.ai/api/v3';

const hasWaveSpeed = () => !!process.env.WAVESPEED_KEY;

// ---- WaveSpeed video routes -------------------------------------------------
// internal app slug -> how to build the WaveSpeed request. `pick` chooses the
// actual WaveSpeed model id (resolution is a separate model there, not a param).
// Field names verified from each model's page (t2v: prompt/aspect_ratio/duration
// /camera_fixed/seed; i2v adds image/last_image).
const VIDEO_ROUTES = {
  'seedance-2-mini-text-to-video': { kind: 't2v', pick: (o) => o.resolution === '720p' ? 'bytedance/seedance-v1-lite-t2v-720p' : 'bytedance/seedance-v1-lite-t2v-480p' },
  'seedance-2-mini-image-to-video': { kind: 'i2v', pick: (o) => o.resolution === '720p' ? 'bytedance/seedance-v1-lite-i2v-720p' : 'bytedance/seedance-v1-lite-i2v-480p' },
  'seedance-2-text-to-video': { kind: 't2v', pick: () => 'bytedance/seedance-v1-lite-t2v-720p' },
  'seedance-2-image-to-video': { kind: 'i2v', pick: () => 'bytedance/seedance-v1-lite-i2v-720p' },
  'seedance-2-vip-text-to-video': { kind: 't2v', pick: () => 'bytedance/seedance-v1-pro-t2v-1080p' },
  'seedance-2-vip-image-to-video': { kind: 'i2v', pick: () => 'bytedance/seedance-v1-pro-i2v-1080p' },
  'kling-v3-turbo-standard-text-to-video': { kind: 't2v', pick: () => 'kwaivgi/kling-v2.5-turbo-pro/text-to-video' },
  'kling-v3-turbo-standard-image-to-video': { kind: 'i2v', pick: () => 'kwaivgi/kling-v2.5-turbo-pro/image-to-video' },
  'kling-v3-turbo-pro-text-to-video': { kind: 't2v', pick: () => 'kwaivgi/kling-v2.5-turbo-pro/text-to-video' },
  'kling-v3-turbo-pro-image-to-video': { kind: 'i2v', pick: () => 'kwaivgi/kling-v2.5-turbo-pro/image-to-video' },
};

// ---- WaveSpeed avatar routes (hyper-real talking-head clone) -----------------
// Field names verified: image, audio, prompt, resolution, seed, mask_image.
// InfiniteTalk = the flagship (best expression realism, 10-min, cheap).
const AVATAR_ROUTES = {
  'infinitetalk':      { pick: () => 'wavespeed-ai/infinitetalk' },
  'infinitetalk-fast': { pick: () => 'wavespeed-ai/infinitetalk-fast' },
  'omnihuman-1-5':     { pick: () => 'bytedance/avatar-omni-human-1.5' },
  'kling-v2-avatar-pro':      { pick: () => 'kwaivgi/kling-v2-ai-avatar-pro' },
  'kling-v2-avatar-standard': { pick: () => 'kwaivgi/kling-v2-ai-avatar-standard' },
};

function durInt(duration) { return parseInt(duration, 10) || 5; }

// --- WaveSpeed transport -----------------------------------------------------
async function wsSubmit(model, body) {
  const res = await fetch(`${WS_BASE}/${model}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WAVESPEED_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j && (j.message || j.error)) || ('WaveSpeed HTTP ' + res.status));
  const id = j.data && j.data.id;
  if (!id) throw new Error('WaveSpeed did not return a task id');
  return id;
}

async function wsPoll(id) {
  const res = await fetch(`${WS_BASE}/predictions/${id}/result`, {
    headers: { Authorization: `Bearer ${process.env.WAVESPEED_KEY}` },
  });
  const j = await res.json().catch(() => ({}));
  const d = j.data || {};
  const done = d.status === 'completed';
  const failed = d.status === 'failed';
  return { status: done ? 'completed' : failed ? 'failed' : 'processing', url: done ? (d.outputs && d.outputs[0]) : null };
}

// --- MuAPI transport ---------------------------------------------------------
async function muSubmit(model, body) {
  const res = await fetch(`${MU_BASE}/${model}`, {
    method: 'POST',
    headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) {
    let msg = 'Engine HTTP ' + res.status;
    if (j && j.detail) msg = Array.isArray(j.detail) ? j.detail.map((d) => (d && d.msg) || JSON.stringify(d)).join('; ') : (typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail));
    else if (j && j.error) msg = j.error.message || j.error;
    throw new Error(msg);
  }
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not start the job');
  return id;
}

async function muPoll(id) {
  const p = await (await fetch(`${MU_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': process.env.MUAPI_KEY } })).json();
  const done = p.status === 'completed';
  const failed = p.status === 'failed' || p.status === 'cancelled';
  return { status: done ? 'completed' : failed ? 'failed' : 'processing', url: done ? (p.outputs && p.outputs[0]) : null, cost_usd: p.cost && p.cost.amount_usd, raw: p };
}

// ============================================================
// PUBLIC API
// ============================================================

// Submit a VIDEO job. Returns { requestId, provider } — requestId is already
// prefixed for the poller. `hosted` is the array of already-hosted reference
// image URLs (start frame first). Falls back to MuAPI when WaveSpeed can't
// serve this model or no key is set.
async function submitVideo(model, opts, hosted) {
  const route = VIDEO_ROUTES[model];
  if (route && hasWaveSpeed()) {
    const wsModel = route.pick(opts);
    const body = { prompt: opts.prompt || '', aspect_ratio: opts.aspect || '9:16', duration: durInt(opts.duration) };
    if (route.kind === 'i2v') {
      body.image = (hosted && hosted[0]) || opts.image_url;
      if (hosted && hosted[1]) body.last_image = hosted[1];
    }
    const id = await wsSubmit(wsModel, body);
    return { requestId: 'ws:' + id, provider: 'wavespeed' };
  }
  // MuAPI (default / fallback) — unchanged behaviour.
  const payload = { prompt: opts.prompt, aspect_ratio: opts.aspect, duration: durInt(opts.duration), resolution: opts.resolution };
  if (hosted && hosted.length) { payload.images_list = hosted; payload.image_url = hosted[0]; }
  const id = await muSubmit(model, payload);
  return { requestId: id, provider: 'muapi' };
}

// Submit an AVATAR (talking-head) job. image + audio -> talking video.
async function submitAvatar(model, { image, audio, prompt, resolution }) {
  const route = AVATAR_ROUTES[model];
  if (route && hasWaveSpeed()) {
    const body = { image, audio, prompt: prompt || '', resolution: resolution || '480p' };
    const id = await wsSubmit(route.pick(), body);
    return { requestId: 'ws:' + id, provider: 'wavespeed' };
  }
  // MuAPI fallback (existing omnihuman / kling-avatar slugs).
  const id = await muSubmit(model, { image_url: image, audio_url: audio, prompt });
  return { requestId: id, provider: 'muapi' };
}

// Poll ANY job by its (possibly prefixed) request id.
async function pollAny(requestId) {
  if (typeof requestId === 'string' && requestId.indexOf('ws:') === 0) return wsPoll(requestId.slice(3));
  return muPoll(requestId);
}

// ---- WaveSpeed voice cloning (Omnivoice) -------------------------------------
// One call does BOTH cloning and synthesis: give a short reference speech
// sample (any URL/file-path/base64) + target text, get back audio spoken in
// that voice — no separate "create voice profile" step, no persistent voice
// id to manage. Every call re-supplies the reference sample, so this is a
// WaveSpeed-only feature with no external voice provider involved.
// Fields verified live 2026-07-16 via a clean validation error: `text` and
// `audio` are required, `speed` is optional (default 1). Routes through the
// same "ws:"-prefixed pollAny() as video/avatar jobs.
async function submitSpeech({ audio, text, speed }) {
  if (!hasWaveSpeed()) throw new Error('Voice cloning needs WAVESPEED_KEY.');
  if (!audio) throw new Error('Missing reference voice sample.');
  if (!text) throw new Error('Missing script text.');
  const id = await wsSubmit('wavespeed-ai/omnivoice/voice-clone', { audio, text, speed: speed || 1 });
  return { requestId: 'ws:' + id, provider: 'wavespeed' };
}

module.exports = { submitVideo, submitAvatar, submitSpeech, pollAny, VIDEO_ROUTES, AVATAR_ROUTES, hasWaveSpeed };
