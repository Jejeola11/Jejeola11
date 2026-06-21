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
  lite_mo: { label: 'Studio Lite (monthly)', amount_naira: 5000,  credits: 150, kind: 'sub', plan: 'lite' },
  pro_mo:  { label: 'Studio Pro (monthly)',  amount_naira: 15000, credits: 600, kind: 'sub', plan: 'pro'  },
};

// Credits charged per generation, by model. Image only for now (video later).
const MODEL_COST = {
  'flux-schnell': 1,
  'flux-dev':     2,
  'nano-banana':  2,
  'flux-pro':     4,
};

module.exports = { PACKS, MODEL_COST };
