// ============================================================
// Fuse Studio — pricing source of truth (SERVER SIDE).
// The browser NEVER decides the price. The webhook + init function
// only trust the numbers in this file, keyed by `pack`.
//
// Tune freely: amount_naira is what the customer pays, credits is
// what they receive. `kind: 'sub'` packs also extend plan access 30 days.
// MuAPI bills us per image (~a few cents); keep credits priced with margin.
// ============================================================
const PACKS = {
  // ---- One-time credit packs (paid by transfer, instant, no recurring) ----
  starter: { label: 'Starter',  amount_naira: 2500,  credits: 60,  kind: 'pack' },
  creator: { label: 'Creator',  amount_naira: 6000,  credits: 180, kind: 'pack' }, // best value
  pro:     { label: 'Pro Pack', amount_naira: 12000, credits: 420, kind: 'pack' },

  // ---- Monthly plans (renew by paying again; we remind before expiry) ----
  creator_mo: { label: 'Studio Creator (monthly)',  amount_naira: 9000,  credits: 350, kind: 'sub', plan: 'creator' },
  pro_mo:     { label: 'Studio Pro (monthly)', amount_naira: 20000, credits: 800, kind: 'sub', plan: 'pro' },
  agency_mo:  { label: 'Studio Agency (monthly)',   amount_naira: 75000, credits: 3500, kind: 'sub', plan: 'agency' },

  // ---- Fuse Atelier 2.0 — the merged 3-tier course (one-time, money only) ----
  // Each tier unlocks its course content via a module_unlocks row (see webhook)
  // and includes creation credits so the studio works out of the box.
  atelier_starter: { label: 'Fuse Atelier — Starter', amount_naira: 10000, credits: 100,  kind: 'course', course: 'atelier-starter' },
  atelier_creator: { label: 'Fuse Atelier — Creator', amount_naira: 25000, credits: 400,  kind: 'course', course: 'atelier-creator', plan: 'creator' },
  atelier_empire:  { label: 'Fuse Atelier — Empire',  amount_naira: 70000, credits: 1200, kind: 'course', course: 'atelier-empire',  plan: 'pro' },
  // Checkout order bump: prompt & template vault (research: 30-40% take rate).
  vault_bump: { label: 'Prompt & Template Vault', amount_naira: 4500, credits: 0, kind: 'course', course: 'atelier-vault' },
  // Legacy single-price course (kept so old links/grants don't break).
  course: { label: 'Fuse Atelier Course', amount_naira: 60000, credits: 500, kind: 'course', plan: 'pro' },

  // ---- Credit top-up bundles (one-time; buy anytime, even mid-plan) ----
  bundle_120: { label: '120 credits', amount_naira: 3000,  credits: 120, kind: 'pack' },
  bundle_320: { label: '320 credits', amount_naira: 7000,  credits: 320, kind: 'pack' },
  bundle_750: { label: '750 credits', amount_naira: 15000, credits: 750, kind: 'pack' },
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

// Referral rewards (credits).
const REFERRAL = { reward: 30, bonus: 15 };

// Naira per US dollar — used only for displaying $ prices to foreigners.
// Update to taste; pricing should be value-based, not a strict FX conversion.
const USD_RATE = 1550;

// ============================================================
// COST-PLUS PRICING — guarantees profit on every generation.
//   cost_usd = what MuAPI charges us per generation.
//   We sell credits at ~$0.016 each (derived from the plans).
//   Credit price = ceil(cost / 0.016 * MARGIN). Change MARGIN once to reprice all.
// Update the cost_usd numbers below with MuAPI's exact prices anytime.
// ============================================================
const CREDIT_USD = 0.016;   // revenue we get per credit sold
const IMAGE_MARGIN = 2.5;   // profit multiple on images & tools (lowered from 4 — friendlier pricing, still ~2.5x profit)
const VIDEO_MARGIN = 1.5;   // lowered from 2 — video is the headline feature; keep it cheap to drive adoption
const creditsFor = (cost_usd, margin) => Math.max(1, Math.ceil((cost_usd / CREDIT_USD) * margin));

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
  'seedance-2-text-to-video': 0.60,            'seedance-2-image-to-video': 0.60,
  'seedance-2-vip-text-to-video': 1.50,        'seedance-2-vip-image-to-video': 1.50,
  'kling-v3-turbo-standard-text-to-video': 0.56, 'kling-v3-turbo-standard-image-to-video': 0.56,
  'kling-v3-turbo-pro-text-to-video': 0.70,    'kling-v3-turbo-pro-image-to-video': 0.70,
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

// slug -> credits charged (auto-computed for guaranteed margin)
const IMAGE_MODELS = Object.fromEntries(Object.entries(IMAGE_COST).map(([k, v]) => [k, creditsFor(v, IMAGE_MARGIN)]));
const VIDEO_MODELS = Object.fromEntries(Object.entries(VIDEO_COST).map(([k, v]) => [k, creditsFor(v, VIDEO_MARGIN)]));
const TOOL_MODELS = Object.fromEntries(Object.entries(TOOL_COST).map(([k, v]) => [k, creditsFor(v, IMAGE_MARGIN)]));
const MODEL_COST = IMAGE_MODELS; // back-compat alias

// ---- AI Avatar Creator (long-form video) — WaveSpeed-only cost model ------
// InfiniteTalk (chunked, image+audio -> talking video) is the real cost
// driver; Omnivoice voice-clone narration is comparatively tiny. Both
// verified live 2026-07-15/16. Priced per minute of FINISHED video, charged
// up-front from the script's estimated speech duration (~150 words/min) so
// the user knows the cost before anything runs; refunded pro-rata if a job
// fails partway (see avatar-video-create.js / avatar-video-status.js).
const AVATAR_VIDEO_PER_MIN_USD = 3.6;   // InfiniteTalk, upper end of the $54-108/30min range
const AVATAR_VOICE_PER_MIN_USD = 0.05;  // Omnivoice narration
const AVATAR_VIDEO_MARGIN = 1.6;        // this is a premium, compute-heavy feature — thinner margin, still profitable
// `includeVoice` is false when the user supplies their own pre-made
// narration (skips Omnivoice cloning entirely) — no voice-generation cost
// applies in that case, just the video-generation cost.
function avatarVideoCredits(estimatedMinutes, includeVoice = true) {
  const mins = Math.max(1, Math.ceil(estimatedMinutes));
  const cost = mins * (AVATAR_VIDEO_PER_MIN_USD + (includeVoice ? AVATAR_VOICE_PER_MIN_USD : 0));
  return creditsFor(cost, AVATAR_VIDEO_MARGIN);
}
// ~150 spoken words/minute — used to estimate a script's runtime before any
// audio has actually been generated (for the up-front credit charge).
function estimateScriptMinutes(script) {
  const words = (script || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(0.2, words / 150);
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

module.exports = { PACKS, MODEL_COST, IMAGE_MODELS, VIDEO_MODELS, TOOL_MODELS, IMAGE_COST, VIDEO_COST, TOOL_COST, creditsFor, REFERRAL, USD_RATE, REACTOR_COST, FREE_IMAGE, FREE_VIDEO, FREE_TOOLS, FREE_REACTOR, canUseFree, PROMO, promoActive, creditsForPack, avatarVideoCredits, estimateScriptMinutes, audioCredits };
