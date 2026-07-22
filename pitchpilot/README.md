# PitchPilot v6 — pitch any client, land the job

Three modes:
- **💼 Job post** — paste the job, type the client's name/company/location/history
  + up to 2 previous jobs they posted. Now also returns a **fit score (1-10)**
  so you can triage which jobs are actually worth your time before you write
  anything — the same "score before you pitch" idea GigRadar built its whole
  product around.
- **🎯 Direct outreach** — their @username, website (if any), what you found
  about them, what you're pitching, and your goal.
- **🗺️ Find Leads** — NEW. Scan your portfolio (Upwork/Behance/Drive/website),
  then search real local businesses on Google Maps by niche + location. Every
  result is saved to a tracker (New → Contacted → Replied → Sample sent →
  Won/Lost) with the specific gaps found (no website, thin review count, no
  review responses — the exact things the reference "map gap" videos teach
  you to spot). Tap "Write outreach" on any lead to get problem-first
  messages that lead with that specific gap, plus a concrete brief on what
  to actually build/send once they reply wanting to see something.

Every mode returns ready-to-send messages (Email, WhatsApp, Instagram,
LinkedIn) + a LinkedIn connect note, written by Claude Sonnet 4.5.

## Lead Finder — how the data sourcing actually works
Find Leads calls **Outscraper** (outscraper.com) — the same paid Google Maps
data provider shown in the reference videos this feature was modeled on.
This is a real, ToS-compliant data company (not a scraper we wrote
ourselves), priced per result — you'll need your own Outscraper API key
(see setup below). A lead with no email gets one best-effort attempt at
finding one by reading the business's own public website for a contact
address — that's just fetching a public page, no compliance concern there.

If `OUTSCRAPER_API_KEY` isn't set yet, Find Leads shows a clear "add this
env var" message instead of failing silently.

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
2. Run `supabase-pitchpilot.sql` in that project's SQL Editor. (If you already
   ran an older version of this file, it's safe to re-run — it only adds the
   new `pp_leads` table, it won't touch your existing `pp_usage` data.)
3. In that project → Settings → API, copy the **Project URL** and **anon
   public key**, and paste them into `config.js` (`SUPABASE_URL` /
   `SUPABASE_ANON_KEY`). Also copy the **service_role key** for step 4.
4. On the PitchPilot Netlify site → Site configuration → Environment
   variables, add:
   - `MUAPI_KEY` — your MuAPI key
   - `SUPABASE_URL` — the new project's URL (same value as in config.js)
   - `SUPABASE_SERVICE_ROLE_KEY` — the new project's service_role key (secret — env var only, never in config.js)
   - `PP_ADMIN_EMAILS` — your email (comma-separated if more than one)
   - `OUTSCRAPER_API_KEY` — needed for the new Find Leads tab. Get one at
     outscraper.com (pay-per-result pricing, similar to what's shown in the
     reference videos this feature is based on). Everything else works
     without this key — Find Leads will just show a setup message until you
     add it.
5. **Netlify build settings: Base directory = `pitchpilot`.** (This is the
   same as before — Find Leads didn't change the deploy setup, only added
   new files inside this folder.)
6. Commit `config.js` with your real values and push, or edit it directly in
   GitHub's web editor.

## Demo builder
`demo-builder.html` generates a one-page demo site for a prospect (name,
niche, city, phone, colour) as a single downloadable HTML file. Once this
site is deployed, it's live at `/demo-builder.html` on your PitchPilot domain
— no separate deploy needed.

## Files
- `index.html` — app (auth, mode tabs, plans, admin box, pitch journal, Lead Finder)
- `config.js` — this site's OWN Supabase URL/key + admin email list (edit this, not index.html)
- `demo-builder.html` — the prospect demo-site generator
- `netlify/functions/pitch-ai.js` — writes the outreach messages, spends 1 use per run (job/instagram/lead modes)
- `netlify/functions/find-leads.js` — Google Maps lead search via Outscraper, saves results to `pp_leads`
- `netlify/functions/scan-portfolio.js` — reads your portfolio links and summarizes who to target (free, no use spent)
- `netlify/functions/leads-track.js` — list/update/delete leads (the tracker behind Find Leads)
- `netlify/functions/pp-grant.js` — admin plan activation (checks `PP_ADMIN_EMAILS`)
- `netlify/functions/_pp.js` — shared Supabase/usage helpers
- `supabase-pitchpilot.sql` — the pp_usage and pp_leads tables
