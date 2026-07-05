# PitchPilot v5 — pitch any client, land the job

Two modes:
- **💼 Job post** — paste the job, type the client's name/company/location/history
  + up to 2 previous jobs they posted.
- **📸 Instagram client** — their @username, website (if any), what you found
  about them, what you're pitching, and your goal.

Either way you get 4 ready-to-send messages (Email, WhatsApp, Instagram,
LinkedIn) + a LinkedIn connect note, written by Claude Sonnet 4.5.

## Accounts & plans
- Sign up with email + password — **PitchPilot has its own, fully separate
  Supabase project.** Public sign-ups here never touch or share Fuse Studio
  accounts.
- Every new account gets **3 free pitches**.
- Plans (paid via WhatsApp for now; the in-app payment platform comes later):
  - Starter — ₦1,000/mo → 30 pitches
  - Pro — ₦3,000/mo → 100 pitches
  - Agency — ₦7,000/mo → 300 pitches
- **Activating a buyer:** sign in with an email listed in `config.js`'s
  `ADMIN_EMAILS` (shows the 👑 Admin box) → enter their email + plan → Activate.
  The real authorization check happens server-side in `pp-grant.js` via the
  `PP_ADMIN_EMAILS` Netlify env var — the config.js list is cosmetic only.

## One-time setup (do this once)
1. Create a **new, free Supabase project** at supabase.com — do NOT reuse the
   Fuse Studio one.
2. Run `supabase-pitchpilot.sql` in that project's SQL Editor.
3. In that project → Settings → API, copy the **Project URL** and **anon
   public key**, and paste them into `config.js` (`SUPABASE_URL` /
   `SUPABASE_ANON_KEY`). Also copy the **service_role key** for step 4.
4. On the PitchPilot Netlify site → Site configuration → Environment
   variables, add:
   - `MUAPI_KEY` — your MuAPI key
   - `SUPABASE_URL` — the new project's URL (same value as in config.js)
   - `SUPABASE_SERVICE_ROLE_KEY` — the new project's service_role key (secret — env var only, never in config.js)
   - `PP_ADMIN_EMAILS` — your email (comma-separated if more than one)
5. Netlify build settings: Base directory = `pitchpilot`.
6. Commit `config.js` with your real values and push, or edit it directly in
   GitHub's web editor.

## Demo builder
`demo-builder.html` generates a one-page demo site for a prospect (name,
niche, city, phone, colour) as a single downloadable HTML file. Once this
site is deployed, it's live at `/demo-builder.html` on your PitchPilot domain
— no separate deploy needed.

## Files
- `index.html` — app (auth, mode tabs, plans, admin box, pitch journal)
- `config.js` — this site's OWN Supabase URL/key + admin email list (edit this, not index.html)
- `demo-builder.html` — the prospect demo-site generator
- `netlify/functions/pitch-ai.js` — writes the 4 messages, spends 1 use per run
- `netlify/functions/pp-grant.js` — admin plan activation (checks `PP_ADMIN_EMAILS`)
- `netlify/functions/_pp.js` — shared Supabase/usage helpers
- `supabase-pitchpilot.sql` — the pp_usage table
