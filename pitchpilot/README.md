# PitchPilot — deploy guide (same repo, its own Netlify site)

PitchPilot lives in this `pitchpilot/` folder of the Fuse Studio repo, but deploys
as its OWN separate Netlify site. The two sites never mix — Fuse Studio's site
ignores this folder's Netlify config, and PitchPilot's site only builds this folder.

## Connect it on Netlify (one time)

1. app.netlify.com → **Add new site → Import an existing project → GitHub**
2. Pick the SAME repo you already use for Fuse Studio (`Jejeola11/Jejeola11`)
3. Pick the same branch Fuse Studio deploys from
4. **Base directory:** type `pitchpilot`  ← this is the key step; it scopes the
   site to this folder only (publish directory and functions are picked up
   automatically from this folder's netlify.toml)
5. BEFORE deploying, open **Site configuration → Environment variables** and add:
   - `MUAPI_KEY` = your MuAPI key  ← **required** (powers the Haiku + Sonnet pitch AI)
   - `SERPER_API_KEY` = (optional) a serper.dev key — auto-finds LinkedIn/website/Instagram
   - `HUNTER_API_KEY` = (optional) a hunter.io key — auto-finds the client's email
6. **Deploy site** → rename it (e.g. `fuse-pitchpilot`) in Site settings

Without the two optional keys everything still works — the app shows Google-search
shortcut buttons for finding contacts manually instead of auto-filling them.

## Updating later

Any push to this folder redeploys the PitchPilot site automatically.

## What's inside

- `index.html` — the whole app (profile + portfolio, job scanner, 6-pitch output,
  channel tracker, pitch journal)
- `netlify/functions/pitch-ai.js` — Claude Haiku extracts the client
  (name/company/location/pain points/tone), then Claude Sonnet suggests the best
  portfolio project and writes all 6 pitches (Upwork proposal, LinkedIn DM,
  LinkedIn connect note, WhatsApp, Instagram, email) — via your MuAPI key
- `netlify/functions/find-contacts.js` — optional auto contact finder (Serper + Hunter)
- `netlify/functions/parse-job.js` — reads a pasted job URL server-side
- `netlify.toml` — build config for THIS site (paths are relative to the base directory)
