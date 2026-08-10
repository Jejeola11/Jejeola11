// ============================================================
// Fuse Studio — pricing source of truth (SERVER SIDE).
// The browser NEVER decides the price. The webhook + init function
// only trust the numbers in this file, keyed by `pack`.
//
// Tune freely: amount_naira is what the customer pays, credits is
// what they receive. `kind: 'sub'` packs also extend plan access 30 days.
// MuAPI bills us per image (~a few cents); keep credits priced with margin.
// ============================================================
// Credit REPRICE, 10 Aug 2026 — a credit is now worth far more (CREDIT_USD
// 0.016 -> 0.11, ~6.9x), because generation credit-costs were compressed way
// down (e.g. nano-banana 6cr -> 2cr) for simpler, friendlier numbers. Every
// pack below was rescaled so its realized ₦/credit still sits at or above
// the new CREDIT_USD floor (same "never sell a credit under cost" principle
// as before) — naira prices are UNCHANGED, only the credit counts dropped.
// Old credit counts are kept in trailing comments for reference.
const PACKS = {
  // ---- One-time credit packs (paid by transfer, instant, no recurring) ----
  starter: { label: 'Starter',  amount_naira: 2500,  credits: 10,  kind: 'pack' }, // was 60
  creator: { label: 'Creator',  amount_naira: 6000,  credits: 30, kind: 'pack' }, // best value // was 180
  pro:     { label: 'Pro Pack', amount_naira: 12000, credits: 70, kind: 'pack' }, // was 420

  // ---- Monthly plans (renew by paying again; we remind before expiry) ----
  creator_mo: { label: 'Studio Creator (monthly)',  amount_naira: 9000,  credits: 58, kind: 'sub', plan: 'creator' }, // was 350
  pro_mo:     { label: 'Studio Pro (monthly)', amount_naira: 20000, credits: 129, kind: 'sub', plan: 'pro' }, // was 800
  agency_mo:  { label: 'Studio Agency (monthly)',   amount_naira: 75000, credits: 480, kind: 'sub', plan: 'agency' }, // was 3500

  // ---- Fuse Atelier 2.0 — the merged 3-tier course (one-time, money only) ----
  // Each tier unlocks its course content via a module_unlocks row (see webhook)
  // and includes creation credits so the studio works out of the box.
  atelier_starter: { label: 'Fuse Atelier — Starter', amount_naira: 10000, credits: 17,  kind: 'course', course: 'atelier-starter' }, // was 100
  atelier_creator: { label: 'Fuse Atelier — Creator', amount_naira: 25000, credits: 67,  kind: 'course', course: 'atelier-creator', plan: 'creator' }, // was 400
  atelier_empire:  { label: 'Fuse Atelier — Empire',  amount_naira: 70000, credits: 200, kind: 'course', course: 'atelier-empire',  plan: 'pro' }, // was 1200
  // Checkout order bump: prompt & template vault (research: 30-40% take rate).
  vault_bump: { label: 'Prompt & Template Vault', amount_naira: 4500, credits: 0, kind: 'course', course: 'atelier-vault' },
  // Legacy single-price course (kept so old links/grants don't break).
  course: { label: 'Fuse Atelier Course', amount_naira: 60000, credits: 83, kind: 'course', plan: 'pro' }, // was 500

  // The $500 Week — standalone course, paid straight through Paystack (no
  // more "message me on WhatsApp to pay" — see fiveweek.js). Was priced here
  // at ₦5,000, but the real price actually charged to WhatsApp-manual buyers
  // is ₦10,000 (confirmed 10 Aug 2026) — updated to match reality.
  wk_course: { label: 'The $500 Week', amount_naira: 10000, credits: 17, kind: 'course', course: 'wk-course' }, // was 100

  // The Money Engine — standalone client-getting system (niche, profile,
  // proposals, positioning), unbundled from the Fuse Atelier course and
  // sold on its own at money-engine.html. Priced below atelier_starter
  // (₦10,000) on purpose since it's a narrower slice of that bundle, not a
  // replacement for it — see the page's own upsell copy pointing back to
  // Starter for people who want the full AI skill set too.
  money_engine: { label: 'The Money Engine', amount_naira: 6000, credits: 0, kind: 'course', course: 'money-engine' },

  // ---- Credit top-up bundles (one-time; buy anytime, even mid-plan) ----
  bundle_120: { label: '17 credits', amount_naira: 3000,  credits: 17, kind: 'pack' }, // was 100
  bundle_320: { label: '45 credits', amount_naira: 7000,  credits: 45, kind: 'pack' }, // was 300
  bundle_750: { label: '97 credits', amount_naira: 15000, credits: 97, kind: 'pack' }, // was 700
};

// ============================================================
// LAUNCH PROMO — full Fuse Studio launch, 2 days only.
//   Subscription plans (NOT one-time top-up packs) get a credit
//   multiplier; the Fuse Atelier course gets a flat bonus instead of
//   its normal 500. Auto-expires at endsAt — nothing to remember to
//   turn off. Change/extend by editing the dates below only.
// ============================================================
const PROMO = {
  label: 'Fuse Studio Full Launch',
  startsAt: '2026-07-08T00:00:00+01:00',
  endsAt: '2026-07-10T00:00:00+01:00',       // 2 days — WAT
  subMultiplier: { creator_mo: 2, pro_mo: 3, agency_mo: 4 },
  courseCredits: 2500,
};
function promoActive() {
  const now = Date.now();
  return now >= Date.parse(PROMO.startsAt) && now < Date.parse(PROMO.endsAt);
}
// Only subscription packs (creator_mo/pro_mo/agency_mo) and the course pack are
// affected — one-time top-up packs (starter/creator/pro/bundle_*) are untouched.
function creditsForPack(packKey, baseCredits) {
  if (!promoActive()) return baseCredits;
  if (packKey === 'course') return PROMO.courseCredits;
  const mult = PROMO.subMultiplier[packKey];
  return mult ? baseCredits * mult : baseCredits;
}

// Referral rewards (credits) — rescaled with the 10 Aug 2026 reprice (was 30/15).
const REFERRAL = { reward: 5, bonus: 3 };

// Naira per US dollar — used only for displaying $ prices to foreigners.
// Update to taste; pricing should be value-based, not a strict FX conversion.
// Updated 20 Jul 2026 to the real mid-market rate (~₦1,380) + a small
// buffer for drift, was stuck at 1550 (~12% stale) before this.
const USD_RATE = 1400;

// ============================================================
// COST-PLUS PRICING — guarantees profit on every generation.
//   cost_usd = what MuAPI/WaveSpeed charges us per generation.
//   We sell credits at ~$0.11 each (rescaled 10 Aug 2026, was $0.016 — see
//   the PACKS block above for why: credit-costs were compressed into small,
//   friendly numbers, so each credit had to become worth ~6.9x more $).
//   Credit price = ceil(cost / 0.11 * MARGIN). Change MARGIN once to reprice all.
// Update the cost_usd numbers below with MuAPI's/WaveSpeed's exact prices anytime.
// ============================================================
const CREDIT_USD = 0.11;    // revenue we get per credit sold (was 0.016)
const IMAGE_MARGIN = 2.5;   // profit multiple on images & tools (unchanged)
const VIDEO_MARGIN = 2.0;   // raised from 1.5 (10 Aug 2026 — was kept thin to drive adoption; margin sweep raised every 1.5x/1.6x tier to 2x)
const creditsFor = (cost_usd, margin) => Math.max(1, Math.ceil((cost_usd / CREDIT_USD) * margin));
// Image credits are additionally clamped to a tight, easy-to-understand
// 2-6 range regardless of the exact formula output (10 Aug 2026 pricing
// call) — cheap models would otherwise round to 1 credit, expensive ones
// could exceed 6; every image model should feel roughly "a handful of
// credits," not a number the customer has to think about.
const creditsForImage = (cost_usd, margin) => Math.min(6, Math.max(2, creditsFor(cost_usd, margin)));

// IMPORTANT: the keys below are MuAPI endpoint slugs — exactly what we POST to
// /api/v1/{slug}. MuAPI slugs are versioned and change over time. If a model
// errors, copy its exact slug from your MuAPI dashboard (open-gen / API tab) and
// update it here. flux-dev / flux-schnell are stable aliases.
// All slugs below VERIFIED working against the live MuAPI account.
// Costs below reflect WHICHEVER provider each model actually bills through
// now (WaveSpeed first, MuAPI fallback if WAVESPEED_KEY is missing — see
// _providers.js's IMAGE_ROUTES). All WaveSpeed prices below were pulled
// directly from WaveSpeed's own live model catalog (GET /api/v3/models —
// returns real, current pricing + full schemas for its whole catalog) on
// 2026-07-16, not estimated.
const IMAGE_COST = {
  'flux-schnell-image': 0.003,  // was 0.01 on MuAPI — WaveSpeed's wavespeed-ai/flux-schnell verified live at 0.003
  'flux-dev-image': 0.012,      // was 0.025 on MuAPI — WaveSpeed's wavespeed-ai/flux-dev verified live at 0.012
  'gpt-image-2-text-to-image': 0.06,   // OpenAI GPT Image 2 — now routed via WaveSpeed's openai/gpt-image-2/text-to-image (0.06) everywhere it's selected, not just Flyer Studio; MuAPI (0.04) kept only as the automatic fallback if WAVESPEED_KEY is ever missing
  'gpt-image-2-image-to-image': 0.09,  // avatar-modelsheet.js calls MuAPI directly by design (needs up to 20 refs in one call, verified live 2026-07-16) — not part of the general IMAGE_ROUTES swap
  // Flyer Studio's own route — same OpenAI model, WaveSpeed edit variant:
  // ~38-48s real inference (vs MuAPI's 50-90s+), confirmed live 2026-07-16.
  'gpt-image-2-ws-text-to-image': 0.057,
  'gpt-image-2-ws-edit': 0.0665,
  // google/nano-banana-pro (Gemini 3.0 Pro Image) — $0.14/image at the
  // default 1k/2k resolution WaveSpeed uses (confirmed live 2026-07-18),
  // same for both the text-to-image and edit variants. Flyer Studio's hero
  // + layer steps now use this; flyer-composite.js stays on GPT Image 2.
  'nano-banana-pro-ws-text-to-image': 0.14,
  'nano-banana-pro-ws-edit': 0.14,
  'nano-banana': 0.038,       // WaveSpeed's google/nano-banana/text-to-image (0.038) verified live — a few cents above MuAPI's 0.03, but WaveSpeed's edit variant genuinely accepts up to 10 reference images vs the 3 this app used to hard-cap at, which is the more valuable trade for Flyer Studio's "not all my references are being used" problem
  'nano-banana-edit': 0.038,  // google/nano-banana/edit, same reasoning — 10-image cap confirmed via its own live schema (maxItems: 10)
  'nano-banana-2': 0.07,       // google/nano-banana-2/text-to-image + /edit, both 0.07 — edit variant allows up to 14 references (schema-confirmed)
  'qwen-image': 0.02,          // wavespeed-ai/qwen-image/text-to-image-2512 + /edit-2511 — same price as MuAPI, edit variant confirmed up to 3 references
  'flux-2-pro': 0.03,          // was 0.05 on MuAPI — wavespeed-ai/flux-2-pro/text-to-image verified live at 0.03; edit variant up to 3 references
  'seedream-5.0': 0.045,       // bytedance/seedream-v5.0-pro(+/edit) — edit variant explicitly built for "multi-reference image generation," up to 10 references (schema-confirmed)
  'hunyuan-image-3.0': 0.12,   // wavespeed-ai/hunyuan-image-3-instruct — pricier than MuAPI's old 0.03 but a genuinely different/newer model tier; edit variant caps at 2 references
  'hunyuan-image-2.1': 0.025,  // wavespeed-ai/hunyuan-image-2.1 — same price as MuAPI, text-to-image only (no edit variant on WaveSpeed)
  'google-imagen4-ultra': 0.06,
  'hidream_i1_full_image': 0.024, // was 0.03 on MuAPI — wavespeed-ai/hidream-i1-full verified live at 0.024; edit variant is hidream-e1-full (single reference only)
};
const VIDEO_COST = {        // real $ cost, WaveSpeed-first (see _providers.js) then MuAPI fallback
  'seedance-2-mini-text-to-video': 0.40,       'seedance-2-mini-image-to-video': 0.40,
  'seedance-2-text-to-video': 0.60,            'seedance-2-image-to-video': 0.60,        // 480p default tier
  // Explicit resolution tiers added 10 Aug 2026 (pricing call) — real $ from
  // Seedance 2.0's own documented formula: base $0.60/5s @480p, resolution
  // multiplier 720p=2x, 1080p=5x, 4k=10x (see AVATAR_MOTION_PER_MIN_USD's
  // comment below, same underlying model). NOTE: _providers.js's
  // VIDEO_ROUTES doesn't yet branch on resolution for the general Video
  // Studio — these prices are ready, but wiring an actual resolution
  // selector through to WaveSpeed is a separate follow-up.
  'seedance-2-720p-text-to-video': 1.20,       'seedance-2-720p-image-to-video': 1.20,
  'seedance-2-1080p-text-to-video': 3.00,      'seedance-2-1080p-image-to-video': 3.00,
  'seedance-2-4k-text-to-video': 6.00,         'seedance-2-4k-image-to-video': 6.00,
  'seedance-2-vip-text-to-video': 1.50,        'seedance-2-vip-image-to-video': 1.50,
  // "standard"/"pro" map to Kling's 720p/1080p tiers respectively (that's
  // what those quality tiers actually render at). 4k is a new tier, 10 Aug
  // 2026 — cost is ESTIMATED (not yet verified live against WaveSpeed's
  // catalog the way every other price in this file is) by extrapolating
  // Seedance's own resolution-multiplier curve; replace with the real
  // number once confirmed against WaveSpeed's /api/v3/models.
  'kling-v3-turbo-standard-text-to-video': 0.56, 'kling-v3-turbo-standard-image-to-video': 0.56, // = 720p
  'kling-v3-turbo-pro-text-to-video': 0.70,    'kling-v3-turbo-pro-image-to-video': 0.70,        // = 1080p
  'kling-v3-turbo-4k-text-to-video': 1.40,     'kling-v3-turbo-4k-image-to-video': 1.40,          // ESTIMATED
  // Was kept on MuAPI at 0.15 on the (correct at the time) logic that xAI's
  // OWN direct API costs more — but that was never actually compared
  // against WaveSpeed. Confirmed live 2026-07-16 via WaveSpeed's own
  // catalog: x-ai/grok-imagine-video is 0.05 there, cheaper than MuAPI.
  'grok-imagine-text-to-video': 0.05,          'grok-imagine-image-to-video': 0.05,
  'veo3-text-to-video': 1.20,                  'veo3-image-to-video': 1.20,
  // Omni Studio (verified live against MuAPI's catalog + validation endpoints)
  'gemini-omni-video-edit': 2.40,              // needs a Pro/Business MuAPI plan — see omni-video-edit.js
  'seedance-2-omni-reference-no-video': 1.25,
  // WaveSpeed's own Gemini Omni Video Edit — real price from WaveSpeed's own
  // model listing (confirmed live 2026-07-16) — a different, ungated route
  // to the same underlying capability as gemini-omni-video-edit above.
  'gemini-omni-flash-video-edit': 0.16,
  'omnihuman-1-5': 0.25,
  'kling-v2-avatar-pro': 0.75,
  'kling-v2-avatar-standard': 0.35,
};
const TOOL_COST = {         // utility tools (take an input image -> output), WaveSpeed-first (see _providers.js)
  'ai-image-upscale': 0.01,        // was 0.02 on MuAPI — wavespeed-ai/image-upscaler verified live at 0.01
  'ai-background-remover': 0.004,  // was 0.01 on MuAPI — wavespeed-ai/image-background-remover verified live at 0.004
  'ai-object-eraser': 0.025,       // was 0.02 on MuAPI — wavespeed-ai/image-eraser verified live at 0.025
};

// slug -> credits charged (auto-computed for guaranteed margin; images clamp to 2-6)
const IMAGE_MODELS = Object.fromEntries(Object.entries(IMAGE_COST).map(([k, v]) => [k, creditsForImage(v, IMAGE_MARGIN)]));
const VIDEO_MODELS = Object.fromEntries(Object.entries(VIDEO_COST).map(([k, v]) => [k, creditsFor(v, VIDEO_MARGIN)]));
const TOOL_MODELS = Object.fromEntries(Object.entries(TOOL_COST).map(([k, v]) => [k, creditsFor(v, IMAGE_MARGIN)]));
const MODEL_COST = IMAGE_MODELS; // back-compat alias

// Explicit credit overrides, 10 Aug 2026 pricing call — these deliberately
// don't match the cost-plus formula above (Ria dictated exact numbers for
// these specific tiers rather than letting the formula derive them; applied
// after the auto-computation so every other model still gets clean,
// auditable cost-plus math).
Object.assign(VIDEO_MODELS, {
  'seedance-2-mini-text-to-video': 17,     'seedance-2-mini-image-to-video': 17,     // formula would give 8
  'seedance-2-1080p-text-to-video': 45,    'seedance-2-1080p-image-to-video': 45,    // formula would give 55
  'kling-v3-turbo-standard-text-to-video': 6, 'kling-v3-turbo-standard-image-to-video': 6, // = 720p; formula would give 11
  'kling-v3-turbo-pro-text-to-video': 7,   'kling-v3-turbo-pro-image-to-video': 7,   // = 1080p; formula would give 13
  'kling-v3-turbo-4k-text-to-video': 39,   'kling-v3-turbo-4k-image-to-video': 39,
});

// ---- AI Avatar Creator (long-form video) — WaveSpeed-only cost model ------
// Two completely different engines depending on mode, so two completely
// different per-minute costs — this used to be one flat number for both,
// which undercharged motion mode badly once verified against the real
// model actually being called (see 'avatar-motion-seedance-2' in
// _providers.js). Omnivoice voice-clone narration is comparatively tiny
// either way. Priced per minute of FINISHED video, charged up-front from
// the script's estimated speech duration (~150 words/min) so the user
// knows the cost before anything runs; refunded pro-rata if a job fails
// partway (see media-pipeline.js / _avatar-video.js).
const AVATAR_VIDEO_PER_MIN_USD = 3.6;   // InfiniteTalk (talking mode), verified live 2026-07-15 -- $0.30/5s at 720p tier * 12
// Seedance 2.0 image-to-video (motion mode) -- confirmed live 2026-07-25 via
// GET /api/v3/models: base_price $0.60 per 5s at 480p, formula scales
// linearly with duration and by a flat resolution multiplier (720p=2x,
// 1080p=5x, 4k=10x). Genuinely pricier than talking mode -- full
// Hollywood-grade cinematic generation per chunk instead of a constrained
// talking-head animation -- this is real, not a rounding artifact.
const AVATAR_MOTION_PER_MIN_USD = { '480p': 7.2, '720p': 14.4 };
const AVATAR_VOICE_PER_MIN_USD = 0.05;  // Omnivoice narration
const AVATAR_VIDEO_MARGIN = 2.0;        // raised from 1.6 (10 Aug 2026 margin sweep — every 1.5x/1.6x tier moved to 2x)
// `includeVoice` is false when the user supplies their own pre-made
// narration (skips Omnivoice cloning entirely) — no voice-generation cost
// applies in that case, just the video-generation cost. `mode`/`resolution`
// select which engine's per-minute cost applies -- default stays talking/
// InfiniteTalk so every existing call site (which never passed these)
// keeps its exact current price.
function avatarVideoCredits(estimatedMinutes, includeVoice = true, mode = 'talking', resolution = '480p') {
  const mins = Math.max(1, Math.ceil(estimatedMinutes));
  const perMin = mode === 'motion' ? (AVATAR_MOTION_PER_MIN_USD[resolution] || AVATAR_MOTION_PER_MIN_USD['480p']) : AVATAR_VIDEO_PER_MIN_USD;
  const cost = mins * (perMin + (includeVoice ? AVATAR_VOICE_PER_MIN_USD : 0));
  return creditsFor(cost, AVATAR_VIDEO_MARGIN);
}
// ~150 spoken words/minute — used to estimate a script's runtime before any
// audio has actually been generated (for the up-front credit charge).
function estimateScriptMinutes(script) {
  const words = (script || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.2, words / 150);
}

// Sync Labs' lipsync-2-pro (the resync pass) — confirmed live 2026-07-17,
// billed per second of audio, $0.08/s ($4.80/min). Genuinely pricier than
// the original InfiniteTalk generation itself ($3.60/min) — this is a real,
// meaningful add-on cost, not a rounding difference, so it's kept as an
// explicit opt-in second pass rather than baked into every video by default.
const RESYNC_PER_SEC_USD = 0.08;
const RESYNC_MARGIN = 2.0; // raised from 1.6 (10 Aug 2026 margin sweep)
function resyncCredits(durationSec) {
  const secs = Math.max(1, Math.ceil(durationSec || 0));
  return creditsFor(secs * RESYNC_PER_SEC_USD, RESYNC_MARGIN);
}

// Kling Lip-Sync Dialogue (add speech to an existing video) — confirmed
// live on WaveSpeed's catalog 2026-07-20. Text mode is a flat $0.14/run
// (built-in TTS from a typed script, no separate audio cost); audio mode
// is $0.03/sec of the audio track, $0.15 minimum (5s floor).
const LIPSYNC_TEXT_FLAT_USD = 0.14;
const LIPSYNC_AUDIO_PER_SEC_USD = 0.03;
const LIPSYNC_MARGIN = 2.0; // raised from 1.6 (10 Aug 2026 margin sweep)
function lipsyncDialogueCredits(mode, durationSec) {
  if (mode === 'audio') {
    const secs = Math.max(5, Math.ceil(durationSec || 5));
    return creditsFor(secs * LIPSYNC_AUDIO_PER_SEC_USD, LIPSYNC_MARGIN);
  }
  return creditsFor(LIPSYNC_TEXT_FLAT_USD, LIPSYNC_MARGIN);
}

// ---- Audio Studio (standalone narration/voiceover, Omnivoice) -------------
// Same real per-minute cost as the avatar pipeline's voice track, priced on
// its own with a friendlier margin since there's no video-generation cost
// riding alongside it here.
const AUDIO_MARGIN = 3;
function audioCredits(estimatedMinutes) {
  const mins = Math.max(0.2, estimatedMinutes);
  return creditsFor(mins * AVATAR_VOICE_PER_MIN_USD, AUDIO_MARGIN);
}

// Fuse Reactor — text-AI costs (credits per message). MuAPI charges ~$0 for
// these, so even 1 credit is almost pure profit.
const REACTOR_COST = {
  'claude-sonnet-4-5': 2,
  'claude-opus-4-5': 3,
  'claude-haiku-4-5': 1,
  'gpt-5-5': 2,
  'gpt-5-2': 1,
  'gemini-2-5-pro': 2,
  'gemini-2-5-flash': 1,
};

// Plan access tiers. Free users can generate with ANY image or video model —
// their credit balance is the only limiter. Tools still need a subscription.
// Admin bypasses all restrictions.
const FREE_IMAGE = Object.keys(IMAGE_MODELS);
const FREE_VIDEO = Object.keys(VIDEO_MODELS);
const FREE_TOOLS = [];           // free users can't use tools
const FREE_REACTOR = ['gpt-5-2', 'gemini-2-5-flash'];
function canUseFree(model) {
  return (model in IMAGE_MODELS) || (model in VIDEO_MODELS) || FREE_REACTOR.includes(model);
}

// ---- Trial tier — what a never-purchased free user can spend giveaway
// credits on (signup trial, daily streak). Capped to the cheapest model per
// category so acquisition cost stays predictable instead of scaling with
// whichever model a new signup happens to try first (e.g. a $1.20 Veo3
// render or a $14.40/min avatar motion clip on credits nobody paid for —
// see the cost audit). Once a user has an actual purchase on record
// (getPlan's hasPurchased), this cap no longer applies.
const TRIAL_IMAGE = ['flux-schnell-image'];
const TRIAL_VIDEO = ['grok-imagine-text-to-video', 'grok-imagine-image-to-video'];
function canUseTrial(model) {
  return TRIAL_IMAGE.includes(model) || TRIAL_VIDEO.includes(model);
}

module.exports = { PACKS, MODEL_COST, IMAGE_MODELS, VIDEO_MODELS, TOOL_MODELS, IMAGE_COST, VIDEO_COST, TOOL_COST, creditsFor, REFERRAL, USD_RATE, REACTOR_COST, FREE_IMAGE, FREE_VIDEO, FREE_TOOLS, FREE_REACTOR, canUseFree, TRIAL_IMAGE, TRIAL_VIDEO, canUseTrial, PROMO, promoActive, creditsForPack, avatarVideoCredits, estimateScriptMinutes, audioCredits, resyncCredits, lipsyncDialogueCredits };
