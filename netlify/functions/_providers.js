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
const GOOGLE_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const hasWaveSpeed = () => !!process.env.WAVESPEED_KEY;
// GEMINI_API_KEY billing note: unlike MuAPI/WaveSpeed (small prepaid credit
// pools where a bad call costs cents), this key bills directly against a
// real Google account with no visible cap here. Built from Google's stable,
// documented Imagen (`predict`) / Veo (`predictLongRunning`) API contracts
// — NOT live-tested with an actual generation call in this session, on
// purpose, to avoid spending real money without the account owner directly
// watching. Test with a small manual generation before relying on it.
const hasGoogle = () => !!process.env.GEMINI_API_KEY;

// ---- WaveSpeed's own LLM API (replaces MuAPI's Claude wrapper) -------------
// A genuine unified, OpenAI-compatible chat-completions endpoint — 260+
// models including Claude, through the SAME WAVESPEED_KEY already used for
// every image/video/audio route above. Confirmed live 2026-07-17:
//   POST https://llm.wavespeed.ai/v1/chat/completions
//   Authorization: Bearer <WAVESPEED_KEY>
//   body: { model, messages: [{ role, content }] }
//     content can be a plain string, OR an array of
//     [{type:'text',text}, {type:'image_url', image_url:{url}}] for vision.
//   Genuinely SYNCHRONOUS — the completion is in the same response, no
//   request_id/poll cycle (unlike MuAPI's Claude wrapper, which is async).
// Model slug is 'anthropic/claude-sonnet-4.5' (note the DOT, not the dash
// MuAPI used) — every other plausible slug returned a clean 404 first.
const WS_LLM_BASE = 'https://llm.wavespeed.ai/v1';
const WS_LLM_MODEL = 'anthropic/claude-sonnet-4.5';

// Fuse Reactor's internal model keys (dash-separated, matching _packs.js's
// REACTOR_COST) -> WaveSpeed's actual LLM slugs (provider-prefixed, dotted
// version numbers) — every one confirmed live 2026-07-17.
const REACTOR_MODEL_MAP = {
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',
  'claude-opus-4-5': 'anthropic/claude-opus-4.5',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
  'gpt-5-5': 'openai/gpt-5.5',
  'gpt-5-2': 'openai/gpt-5.2',
  'gemini-2-5-pro': 'google/gemini-2.5-pro',
  'gemini-2-5-flash': 'google/gemini-2.5-flash',
};

async function chatCompletion({ prompt, imageUrl, model }) {
  if (!hasWaveSpeed()) throw new Error('WAVESPEED_KEY missing.');
  const content = imageUrl
    ? [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: imageUrl } }]
    : prompt;
  const wsModel = (model && REACTOR_MODEL_MAP[model]) || model || WS_LLM_MODEL;
  const res = await fetch(`${WS_LLM_BASE}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WAVESPEED_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: wsModel, messages: [{ role: 'user', content }] }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j && j.error && j.error.message) || `WaveSpeed LLM HTTP ${res.status}`);
  const text = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!text) throw new Error('WaveSpeed LLM returned no text.');
  return text;
}

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
  // grok was previously kept on MuAPI on the (correct, at the time) logic
  // that xAI's OWN direct API costs more than MuAPI's markup on it — but
  // that compared against the wrong baseline. Confirmed live 2026-07-16
  // via WaveSpeed's own /models catalog: WaveSpeed hosts grok-imagine-video
  // at $0.05, cheaper than MuAPI's $0.15 for the same model — this was
  // never actually compared against WaveSpeed before.
  'grok-imagine-text-to-video': { kind: 't2v', pick: () => 'x-ai/grok-imagine-video/text-to-video', durationEnum: [6, 10] },
  'grok-imagine-image-to-video': { kind: 'i2v', pick: () => 'x-ai/grok-imagine-video/image-to-video', durationEnum: [6, 10] },
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

// ---- Google direct routes (Imagen 4 + Veo 3.1) -------------------------------
// Confirmed live 2026-07-16 that this GEMINI_API_KEY has real access to both
// (via GET /v1beta/models — listed with method 'predict' for Imagen and
// 'predictLongRunning' for Veo). Existing MuAPI slugs mapped 1:1 so nothing
// else in the app needs to change to benefit from direct (no-markup) access.
const GOOGLE_IMAGE_ROUTES = {
  'google-imagen4-ultra': 'imagen-4.0-ultra-generate-001',
};
const GOOGLE_VIDEO_ROUTES = {
  'veo3-text-to-video': 'veo-3.1-generate-preview',
  'veo3-image-to-video': 'veo-3.1-generate-preview',
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
  return { status: done ? 'completed' : failed ? 'failed' : 'processing', url: done ? (d.outputs && d.outputs[0]) : null, raw: d };
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

// --- Google transport ---------------------------------------------------------
// Imagen's predict call is SYNCHRONOUS — the image bytes come back in the same
// response, no polling. Returns base64 + mime type; the caller uploads it to
// storage and can mark the job "completed" immediately (same pattern already
// used for chat/flyer-brief's "immediate" responses).
async function googlePredictImage(model, { prompt, aspect }) {
  const res = await fetch(`${GOOGLE_BASE}/models/${model}:predict?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { sampleCount: 1, aspectRatio: aspect || '1:1' } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j.error && j.error.message) || ('Google Imagen HTTP ' + res.status));
  const pred = j.predictions && j.predictions[0];
  // The exact REST field name for the base64 image wasn't confirmed via
  // public docs in this session (Vertex AI Imagen uses bytesBase64Encoded;
  // the Gemini API SDK surfaces it as image.imageBytes) — check both rather
  // than assume, so this doesn't silently break on a naming difference.
  const base64 = pred && (pred.bytesBase64Encoded || pred.imageBytes || (pred.image && pred.image.imageBytes));
  if (!base64) throw new Error('Google Imagen returned no image (unexpected response shape — see _providers.js comment)');
  return { base64, mimeType: (pred && pred.mimeType) || 'image/png' };
}

// Veo is a genuine long-running operation: submit returns an operation name,
// poll that name until done:true, then read the video URI out of the
// response. The exact nested response shape below follows Google's
// documented Veo response envelope but has not been round-trip-verified
// against a completed generation in this session (see the billing-risk note
// on hasGoogle()) — if the shape has drifted, pollGoogleVideo will just see
// no uri and report "processing" forever rather than crashing; watch for
// that if this is the first real thing that goes wrong here.
async function googleSubmitVideo(model, { prompt, aspect }) {
  const res = await fetch(`${GOOGLE_BASE}/models/${model}:predictLongRunning?key=${process.env.GEMINI_API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instances: [{ prompt }], parameters: { aspectRatio: aspect || '16:9' } }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((j.error && j.error.message) || ('Google Veo HTTP ' + res.status));
  if (!j.name) throw new Error('Google Veo did not return an operation name');
  return j.name; // e.g. "models/veo-3.1-generate-preview/operations/abc123"
}

async function googlePollVideo(operationName) {
  const res = await fetch(`${GOOGLE_BASE}/${operationName}?key=${process.env.GEMINI_API_KEY}`);
  const j = await res.json().catch(() => ({}));
  if (!j.done) return { status: 'processing' };
  if (j.error) return { status: 'failed' };
  const samples = j.response && j.response.generateVideoResponse && j.response.generateVideoResponse.generatedSamples;
  const uri = samples && samples[0] && samples[0].video && samples[0].video.uri;
  return { status: uri ? 'completed' : 'failed', url: uri };
}

// ============================================================
// PUBLIC API
// ============================================================

// Submit a VIDEO job. Returns { requestId, provider } — requestId is already
// prefixed for the poller. `hosted` is the array of already-hosted reference
// image URLs (start frame first). Tries Google direct first for veo3 models
// (no MuAPI markup), then WaveSpeed, then falls back to MuAPI.
async function submitVideo(model, opts, hosted) {
  const googleModel = GOOGLE_VIDEO_ROUTES[model];
  if (googleModel && hasGoogle()) {
    const opName = await googleSubmitVideo(googleModel, opts);
    return { requestId: 'g:' + Buffer.from(opName).toString('base64url'), provider: 'google' };
  }
  const route = VIDEO_ROUTES[model];
  if (route && hasWaveSpeed()) {
    const wsModel = route.pick(opts);
    // grok-imagine's WaveSpeed duration is a strict {6,10} enum — our app's
    // duration picker only ever offers "5s"/"10s", so 5 has to round up to
    // the nearest value grok actually accepts rather than being sent as-is.
    const rawDuration = durInt(opts.duration);
    const duration = route.durationEnum ? (route.durationEnum.includes(rawDuration) ? rawDuration : route.durationEnum.reduce((a, b) => Math.abs(b - rawDuration) < Math.abs(a - rawDuration) ? b : a)) : rawDuration;
    const body = { prompt: opts.prompt || '', aspect_ratio: opts.aspect || '9:16', duration };
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
  if (typeof requestId === 'string' && requestId.indexOf('g:') === 0) {
    const opName = Buffer.from(requestId.slice(2), 'base64url').toString();
    return googlePollVideo(opName);
  }
  return muPoll(requestId);
}

// Submit an IMAGE job via Google Imagen when routed and available — the
// call is synchronous (image bytes come back immediately, no polling), so
// this returns the decoded image directly rather than a request id. The
// caller uploads it to storage and can mark its job "completed" right away
// (same immediate-completion pattern already used for chat/flyer-brief).
// Returns null if this model isn't a Google route or the key isn't set —
// callers should fall back to their existing MuAPI path in that case.
async function submitImageGoogle(model, opts) {
  const googleModel = GOOGLE_IMAGE_ROUTES[model];
  if (!googleModel || !hasGoogle()) return null;
  const { base64, mimeType } = await googlePredictImage(googleModel, opts);
  return { base64, mimeType, provider: 'google' };
}

// ---- WaveSpeed voice cloning (Omnivoice) -------------------------------------
// One call does BOTH cloning and synthesis: give a short reference speech
// sample (any URL/file-path/base64) + target text, get back audio spoken in
// that voice — no separate "create voice profile" step, no persistent voice
// id to manage. Every call re-supplies the reference sample, so this is a
// WaveSpeed-only feature with no external voice provider involved.
// Fields verified live 2026-07-16 via a clean validation error: `text` and
// `audio` are required, `speed` is optional (default 1). `reference_text` —
// the exact transcript of the reference audio clip — is confirmed via
// WaveSpeed's published docs (checked 2026-07-17) as an optional field that
// "significantly improves cloning accuracy" (phoneme-level alignment between
// what was said and how it sounds); omitting it is a real contributor to a
// cloned voice drifting toward a generic/default accent instead of the
// speaker's own. Routes through the same "ws:"-prefixed pollAny() as
// video/avatar jobs.
async function submitSpeech({ audio, text, speed, referenceText }) {
  if (!hasWaveSpeed()) throw new Error('Voice cloning needs WAVESPEED_KEY.');
  if (!audio) throw new Error('Missing reference voice sample.');
  if (!text) throw new Error('Missing script text.');
  const body = { audio, text, speed: speed || 1 };
  if (referenceText) body.reference_text = referenceText;
  const id = await wsSubmit('wavespeed-ai/omnivoice/voice-clone', body);
  return { requestId: 'ws:' + id, provider: 'wavespeed' };
}

// ---- Resemble AI (a second, higher-fidelity voice option alongside
// Omnivoice) ------------------------------------------------------------------
// Unlike Omnivoice's every-call "clone from a fresh sample" approach,
// Resemble voices are trained ONCE ahead of time in Resemble's own dashboard
// (or via their separate voice-training API — not wired up here) and reused
// by a persistent voice_uuid. Its /synthesize endpoint is genuinely
// SYNCHRONOUS — the audio comes back in the same response, no polling, no
// request_id — confirmed live 2026-07-17 (a real call against
// f.cluster.resemble.ai/synthesize with a trained voice_uuid returned base64
// WAV audio directly, ~1-2s regardless of clip length so far tested).
// Needs RESEMBLE_API_KEY (Netlify env var, never hardcoded here).
const RESEMBLE_SYNC_BASE = 'https://f.cluster.resemble.ai';
const RESEMBLE_API_BASE = 'https://app.resemble.ai/api/v2';

function hasResemble() { return !!process.env.RESEMBLE_API_KEY; }

async function synthesizeResemble({ text, voiceUuid }) {
  if (!hasResemble()) throw new Error('Resemble voice needs RESEMBLE_API_KEY.');
  if (!voiceUuid) throw new Error('Missing Resemble voice.');
  if (!text) throw new Error('Missing script text.');
  const res = await fetch(`${RESEMBLE_SYNC_BASE}/synthesize`, {
    method: 'POST',
    headers: { Authorization: `Token ${process.env.RESEMBLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ voice_uuid: voiceUuid, data: text }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.success === false) throw new Error((j && j.message) || `Resemble HTTP ${res.status}`);
  if (!j.audio_content) throw new Error('Resemble returned no audio.');
  return { base64: j.audio_content, format: j.output_format || 'wav', durationSec: j.duration };
}

// Lists only the voices actually trained on this account (real clones and
// marketplace add-ons), never the 150+ built-in stock voices every Resemble
// account starts with — distinguished by `source`: stock voices carry
// source "Resemble Voice", this account's own trained clones carry an empty
// source. page_size=200 in one call comfortably covers a real account's own
// voice count (confirmed live: 159 total stock+own fit on a single page).
async function listResembleVoices() {
  if (!hasResemble()) return [];
  const res = await fetch(`${RESEMBLE_API_BASE}/voices?page=1&page_size=200`, {
    headers: { Authorization: `Token ${process.env.RESEMBLE_API_KEY}` },
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.success === false) throw new Error((j && j.message) || `Resemble HTTP ${res.status}`);
  return (j.items || [])
    .filter((v) => !v.source && v.voice_status === 'Ready')
    .map((v) => ({ uuid: v.uuid, name: v.name }));
}

// ---- WaveSpeed's Gemini Omni Video Edit (video-to-video, holistic AI edit) ---
// Real, prompt-driven video editing — captions, restyling, relighting, cuts,
// whatever a single instruction can describe — as opposed to this app's own
// deterministic pipeline (transcribe -> caption -> element -> CTA), which is
// more reliable/controllable but can't do things like true color grading.
// Confirmed live 2026-07-16: exists on WaveSpeed (unlike MuAPI's own
// `gemini-omni-video-edit`, which needs a Pro/Business plan upgrade there —
// this is a different provider, no such gate here). Required fields
// confirmed via clean validation errors: `video`, then `prompt`. Routes
// through the same "ws:"-prefixed pollAny() as every other WaveSpeed job.
async function submitVideoEdit({ video, prompt }) {
  if (!hasWaveSpeed()) throw new Error('AI video editing needs WAVESPEED_KEY.');
  if (!video) throw new Error('Missing video.');
  if (!prompt) throw new Error('Describe the edit.');
  const id = await wsSubmit('google/gemini-omni-flash/video-edit', { video, prompt });
  return { requestId: 'ws:' + id, provider: 'wavespeed' };
}

// ---- Flyer Studio image route (WaveSpeed's GPT Image 2) --------------------
// The model the user specifically wants for "perfect flyer design" — but
// MuAPI's wrapper for it genuinely takes 50-90s+ of real inference time
// regardless of quality/resolution settings (confirmed live 2026-07-16,
// see flyer-hero.js's history). WaveSpeed hosts the SAME OpenAI model
// independently (confirmed live 2026-07-16 — this was wrongly assumed
// unavailable before; always verify a provider's catalog directly rather
// than assuming), and is meaningfully faster: ~38-48s wall-clock, because
// it defaults to quality:medium/resolution:1k instead of MuAPI's
// high/2K default, with no visible quality loss (verified by direct
// image comparison — marble-podium/bokeh product shot). Its aspect_ratio
// is a real native enum here too (unlike MuAPI's GPT Image 2, which only
// has 3 fixed sizes) — every ratio Flyer Studio offers (1:1, 4:5, 3:4,
// 9:16, 16:9) confirmed accepted via live validation-error probing, so no
// center-crop-after-generation workaround is needed on this route. The
// edit/image-to-image variant's reference-image field is `images` (a
// plain array) — NOT `images_list`, which is MuAPI's convention.
const FLYER_IMAGE_ROUTES = {
  'gpt-image-2-ws-text-to-image': 'openai/gpt-image-2/text-to-image',
  'gpt-image-2-ws-edit': 'openai/gpt-image-2/edit',
};
// Returns null (never throws) when WAVESPEED_KEY isn't set, so callers can
// fall back to their own MuAPI route — same graceful-degrade pattern as
// submitImageGoogle.
async function submitFlyerImage(model, { prompt, aspect, images }) {
  const wsModel = FLYER_IMAGE_ROUTES[model];
  if (!wsModel || !hasWaveSpeed()) return null;
  const body = { prompt, aspect_ratio: aspect || '4:5' };
  if (images && images.length) body.images = images;
  const id = await wsSubmit(wsModel, body);
  return { requestId: 'ws:' + id, provider: 'wavespeed' };
}

// ---- WaveSpeed general IMAGE routes (Image Studio, avatar model sheets,
// anywhere an image model is used across the whole app) --------------------
// Every entry below was pulled straight from WaveSpeed's own live model
// catalog (GET /api/v3/models — a real endpoint most integrations miss;
// it returns the full JSON schema for all 941 hosted models) on 2026-07-16,
// not guessed or assumed unavailable. `sizeParam: true` means this model
// has NO aspect_ratio field at all — it takes a literal "W*H" pixel size
// string instead, so ASPECT_TO_SIZE below covers this app's aspect options.
// `maxImages` is the model's OWN real cap (straight from its schema's
// `images` maxItems) — several are far higher than the 3-image cap this
// app used to hard-code out of caution, which is the direct fix for
// references silently not all being "considered": nano-banana and GPT
// Image 2 both really do accept up to 10-16 images, they just were never
// being sent.
const IMAGE_ROUTES = {
  'flux-schnell-image':        { t2i: 'wavespeed-ai/flux-schnell', sizeParam: true },
  'flux-dev-image':            { t2i: 'wavespeed-ai/flux-dev', sizeParam: true, i2i: 'wavespeed-ai/flux-dev', singleImage: true, imageField: 'image' },
  'qwen-image':                { t2i: 'wavespeed-ai/qwen-image/text-to-image-2512', i2i: 'wavespeed-ai/qwen-image/edit-2511', sizeParam: true, maxImages: 3 },
  'flux-2-pro':                { t2i: 'wavespeed-ai/flux-2-pro/text-to-image', i2i: 'wavespeed-ai/flux-2-pro/edit', sizeParam: true, maxImages: 3 },
  'seedream-5.0':               { t2i: 'bytedance/seedream-v5.0-pro', i2i: 'bytedance/seedream-v5.0-pro/edit', maxImages: 10 },
  'hunyuan-image-3.0':          { t2i: 'wavespeed-ai/hunyuan-image-3-instruct/text-to-image', i2i: 'wavespeed-ai/hunyuan-image-3-instruct/edit', sizeParam: true, maxImages: 2 },
  'hunyuan-image-2.1':          { t2i: 'wavespeed-ai/hunyuan-image-2.1', sizeParam: true },
  'hidream_i1_full_image':      { t2i: 'wavespeed-ai/hidream-i1-full', i2i: 'wavespeed-ai/hidream-e1-full', sizeParam: true, singleImage: true, imageField: 'image' },
  'nano-banana':                { t2i: 'google/nano-banana/text-to-image', i2i: 'google/nano-banana/edit', maxImages: 10 },
  'nano-banana-2':              { t2i: 'google/nano-banana-2/text-to-image', i2i: 'google/nano-banana-2/edit', maxImages: 14 },
  'gpt-image-2-text-to-image':  { t2i: 'openai/gpt-image-2/text-to-image', i2i: 'openai/gpt-image-2/edit', maxImages: 16 },
};
// These 5 models have no native aspect_ratio param — this app's own 5
// aspect options mapped to a reasonable "W*H" pixel size for each.
const ASPECT_TO_SIZE = {
  '1:1': '1024*1024', '4:5': '1024*1280', '3:4': '1024*1366', '9:16': '832*1472', '16:9': '1472*832',
};
// Returns null (never throws) when this model has no WaveSpeed route or the
// key isn't set, so callers fall back to their existing MuAPI path exactly
// like submitImageGoogle/submitFlyerImage already do.
async function submitImageWS(model, { prompt, aspect, images }) {
  const route = IMAGE_ROUTES[model];
  if (!route || !hasWaveSpeed()) return null;
  const hasRefs = Array.isArray(images) && images.length > 0;
  if (hasRefs && !route.i2i) return null; // no edit variant on this model — caller's MuAPI fallback handles it
  const wsModel = hasRefs ? route.i2i : route.t2i;
  const body = { prompt };
  if (route.sizeParam) body.size = ASPECT_TO_SIZE[aspect] || '1024*1024';
  else body.aspect_ratio = aspect || '1:1';
  if (hasRefs) {
    if (route.singleImage) body[route.imageField || 'image'] = images[0];
    else body.images = images.slice(0, route.maxImages || 3);
  }
  const id = await wsSubmit(wsModel, body);
  return { requestId: 'ws:' + id, provider: 'wavespeed' };
}

// ---- WaveSpeed utility TOOL routes (upscale, background remove, object
// erase) — same live-catalog verification as IMAGE_ROUTES above. -----------
const TOOL_ROUTES = {
  'ai-image-upscale':      { model: 'wavespeed-ai/image-upscaler', extra: () => ({ target_resolution: '4k' }) },
  'ai-background-remover': { model: 'wavespeed-ai/image-background-remover' },
  'ai-object-eraser':      { model: 'wavespeed-ai/image-eraser', promptField: true },
};
async function submitToolWS(slug, { image, prompt }) {
  const route = TOOL_ROUTES[slug];
  if (!route || !hasWaveSpeed()) return null;
  const body = { image, ...(route.extra ? route.extra() : {}) };
  if (route.promptField && prompt) body.prompt = prompt;
  const id = await wsSubmit(route.model, body);
  return { requestId: 'ws:' + id, provider: 'wavespeed' };
}

module.exports = { submitVideo, submitAvatar, submitSpeech, submitImageGoogle, submitVideoEdit, submitFlyerImage, submitImageWS, submitToolWS, pollAny, VIDEO_ROUTES, AVATAR_ROUTES, hasWaveSpeed, hasGoogle, synthesizeResemble, listResembleVoices, hasResemble, chatCompletion };
