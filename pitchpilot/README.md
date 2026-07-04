# PitchPilot v4 — pitch any client, land the job

Two modes:
- **💼 Job post** — paste the job, type the client's name/company/location/history
  + up to 2 previous jobs they posted.
- **📸 Instagram client** — their @username, website (if any), what you found
  about them, what you're pitching, and your goal.

Either way you get 4 ready-to-send messages (Email, WhatsApp, Instagram,
LinkedIn) + a LinkedIn connect note, written by Claude Sonnet 4.5.

## Accounts & plans
- Sign up with email + password (Supabase — SAME project as Fuse Studio, so
  one account works across both apps).
- Every new account gets **5 free pitches**.
- Plans (paid via WhatsApp for now; the in-app payment platform comes later):
  - Starter — ₦5,000/mo → 100 pitches
  - Pro — ₦12,000/mo → 300 pitches
  - Agency — ₦25,000/mo → 1,000 pitches
- **Activating a buyer:** sign in with your admin account → the 👑 Admin box
  appears at the bottom → enter their email + plan → Activate. (Your Fuse
  Studio admin flag powers this.)

## One-time setup
1. Run `supabase-pitchpilot.sql` in the Supabase SQL Editor (same project as
   Fuse Studio).
2. On the PitchPilot Netlify site → Environment variables, add:
   - `MUAPI_KEY`
   - `SUPABASE_URL` (copy from the Fuse Studio site's env)
   - `SUPABASE_SERVICE_ROLE_KEY` (copy from the Fuse Studio site's env)
3. Netlify build settings: Base directory = `pitchpilot`.

## Files
- `index.html` — app (auth, mode tabs, plans, admin box, pitch journal)
- `netlify/functions/pitch-ai.js` — writes the 4 messages, spends 1 use per run
- `netlify/functions/pp-grant.js` — admin plan activation
- `netlify/functions/_pp.js` — shared Supabase/usage helpers
- `supabase-pitchpilot.sql` — the pp_usage table
