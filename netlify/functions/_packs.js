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
  creator_mo: { label: 'Creator (monthly)',  amount_naira: 9000,  credits: 350, kind: 'sub', plan: 'creator' },
  pro_mo:     { label: 'Studio Pro (monthly)', amount_naira: 20000, credits: 800, kind: 'sub', plan: 'pro' },
  agency_mo:  { label: 'Agency (monthly)',   amount_naira: 75000, credits: 3500, kind: 'sub', plan: 'agency' },

  // ---- Fuse Atelier course bundle (one-time): course access + bonus credits ----
  course: { label: 'Fuse Atelier Course', amount_naira: 60000, credits: 500, kind: 'course', plan: 'pro' },
};

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
const IMAGE_MARGIN = 4;     // profit multiple on images & tools
const VIDEO_MARGIN = 2;     // thinner margin on video (it's expensive — stay competitive)
const creditsFor = (cost_usd, margin) => Math.max(1, Math.ceil((cost_usd / CREDIT_USD) * margin));

// IMPORTANT: the keys below are MuAPI endpoint slugs — exactly what we POST to
// /api/v1/{slug}. MuAPI slugs are versioned and change over time. If a model
// errors, copy its exact slug from your MuAPI dashboard (open-gen / API tab) and
// update it here. flux-dev / flux-schnell are stable aliases.
const IMAGE_COST = {
  'flux-schnell': 0.01,
  'flux-dev': 0.025,
  'nano-banana': 0.039,
  'seedream': 0.03,
  'hunyuan-image-3.0': 0.03,
  'gpt4o-text-to-image': 0.04,
  'flux-2-pro': 0.05,
  'google-imagen4-ultra': 0.06,
};
const VIDEO_COST = {        // ~$0.60–0.80/clip on MuAPI
  'seedance-v2.0-t2v': 0.60,
  'kling-v2.6-pro-t2v': 0.70,
  'minimax-hailuo-02-pro-t2v': 0.60,
  'wan2.5-text-to-video': 0.60,
  'veo3.1-text-to-video': 0.80,
};
const TOOL_COST = {         // utility tools (take an input image -> output)
  'ai-image-upscale': 0.02,
  'topaz-image-upscale': 0.04,
  'ai-background-remover': 0.01,
  'ai-object-eraser': 0.02,
};

// slug -> credits charged (auto-computed for guaranteed margin)
const IMAGE_MODELS = Object.fromEntries(Object.entries(IMAGE_COST).map(([k, v]) => [k, creditsFor(v, IMAGE_MARGIN)]));
const VIDEO_MODELS = Object.fromEntries(Object.entries(VIDEO_COST).map(([k, v]) => [k, creditsFor(v, VIDEO_MARGIN)]));
const TOOL_MODELS = Object.fromEntries(Object.entries(TOOL_COST).map(([k, v]) => [k, creditsFor(v, IMAGE_MARGIN)]));
const MODEL_COST = IMAGE_MODELS; // back-compat alias

// Fuse Reactor — text-AI costs (credits per message). Cheap; included on paid plans.
const REACTOR_COST = {
  'anthropic/claude-3.5-sonnet': 2,
  'google/gemini-flash-1.5': 1,
  'openai/gpt-4o-mini': 1,
};

module.exports = { PACKS, MODEL_COST, IMAGE_MODELS, VIDEO_MODELS, TOOL_MODELS, IMAGE_COST, VIDEO_COST, TOOL_COST, creditsFor, REFERRAL, USD_RATE, REACTOR_COST };
