# PitchPilot — private outreach writer (v3)

Paste a job, type what you know about the client (name, company, location,
history, up to 2 of their previous jobs), and get 4 ready-to-send outreach
messages — EMAIL, WHATSAPP, INSTAGRAM, LINKEDIN (+ a LinkedIn connect note) —
written by Claude Sonnet 4.5. Built for reaching clients directly, not Upwork
proposals. No auto-extract, no Serper, no Hunter — just your input + Claude.

## Deploy (same repo, its own Netlify site)

1. app.netlify.com → Add new site → Import an existing project → GitHub → your
   Jejeola11 repo, same branch
2. **Base directory:** `pitchpilot`
3. Environment variables → add ONE:
   - `MUAPI_KEY` = your MuAPI key   (this is all it needs now)
4. Deploy.

## Private access

The app is passcode-gated so only you can use it. Default passcode: **ria2026**
(change it in index.html — search `gate:'ria2026'`). To make it public later,
set `gate:''` (empty) and it opens to everyone.

## Files
- index.html — the whole app (passcode gate, profile+portfolio, job+client
  inputs, 4-message output, channel tracker, pitch journal)
- netlify/functions/pitch-ai.js — Claude Sonnet 4.5 writes the 4 messages
- netlify.toml — build config
