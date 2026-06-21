// ============================================================
// Fuse Studio — public frontend config.
// These two Supabase values are SAFE to expose (anon/public key).
// Fill them after you create your Supabase project
// (Supabase → Project Settings → API).
// Everything secret (service role, MuAPI, Paystack secret) lives in
// Netlify environment variables and is NEVER in this file.
// ============================================================
window.FUSE = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',

  // Display info for the buy modal. Real prices/credits are enforced
  // server-side in netlify/functions/_packs.js — keep these in sync for display.
  PACKS: [
    { key: 'starter', name: 'Starter',  naira: 2500,  credits: 60,  note: 'Try a few looks',    kind: 'pack' },
    { key: 'creator', name: 'Creator',  naira: 6000,  credits: 180, note: 'Best value',          kind: 'pack', featured: true },
    { key: 'pro',     name: 'Pro Pack', naira: 12000, credits: 420, note: 'For heavy creators',  kind: 'pack' },
    { key: 'lite_mo', name: 'Studio Lite', naira: 5000,  credits: 150, note: 'Monthly plan',     kind: 'sub' },
    { key: 'pro_mo',  name: 'Studio Pro',  naira: 15000, credits: 600, note: 'Monthly plan',     kind: 'sub' },
  ],
};
