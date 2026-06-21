# 🎬 Fuse Studio — setup guide

The hosted, installable version of your app: people **log in**, get **free trial
credits**, **generate images** (no API key), and **top up by bank transfer** via
Paystack — money settles to **your** bank.

You don't need to code anything. You'll create 3 free accounts, paste a few keys,
and deploy. ~30–45 minutes the first time.

---

## What's in this folder

```
app/                       ← the website + app (teal/gold, installable PWA)
  index.html               landing page
  studio.html              the studio (login + generate + buy)
  styles.css  app.js  config.js
  manifest.webmanifest  sw.js  icons/
netlify/functions/         ← the secure backend (holds your keys)
  generate.js              calls the engine, meters credits
  paystack-init.js         starts a transfer payment
  paystack-webhook.js      confirms payment → adds credits
supabase/schema.sql        ← the database (run once)
netlify.toml               routing config
```

---

## Step 1 — Supabase (logins + database) · free

1. Go to **supabase.com** → create a project (pick a region close to Nigeria, e.g. EU West).
2. Open **SQL Editor → New query**, paste **all of `supabase/schema.sql`**, click **Run**.
3. Go to **Project Settings → API** and copy:
   - **Project URL** → this is `SUPABASE_URL`
   - **anon public** key → `SUPABASE_ANON_KEY`
   - **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` (⚠️ secret — backend only)
4. (Recommended for instant access) **Authentication → Providers → Email** →
   turn **OFF "Confirm email"** so new users can generate immediately. (Leave it
   ON if you'd rather verify emails first.)

## Step 2 — Paste the public keys into the app

Edit **`app/config.js`** and set:
```js
SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
SUPABASE_ANON_KEY: 'your-anon-public-key',
```
(These two are safe to be public. Nothing secret goes here.)

## Step 3 — Paystack (payments) · free

1. Create an account at **paystack.com** and complete business verification +
   add your **settlement bank account** (this is where the money lands).
2. **Settings → API Keys & Webhooks** → copy your **Secret Key** (`PAYSTACK_SECRET_KEY`).
3. In that same page set the **Webhook URL** to:
   `https://YOUR-SITE.netlify.app/.netlify/functions/paystack-webhook`
   (you'll know your site URL after Step 5 — come back and set it.)

## Step 4 — MuAPI (the engine)

Copy your **MuAPI key** (the same one your old app asked buyers to paste). It now
lives safely on the server as `MUAPI_KEY` — users never see it.

## Step 5 — Deploy on Netlify (your $9 plan)

1. In Netlify: **Add new site → Import from Git** → pick this repo and the branch
   `claude/product-scaling-landing-page-241hei` (or merge it to `main` first).
2. Build settings: **no build command**, publish directory **`.`** (the
   `netlify.toml` already sets functions + routing).
3. **Site settings → Environment variables** → add these (from the steps above):

   | Key | Value |
   |---|---|
   | `SUPABASE_URL` | your project URL |
   | `SUPABASE_ANON_KEY` | anon public key |
   | `SUPABASE_SERVICE_ROLE_KEY` | service_role secret |
   | `MUAPI_KEY` | your MuAPI key |
   | `PAYSTACK_SECRET_KEY` | Paystack secret key |
   | `APP_URL` | your site URL, e.g. `https://fuse-studio.netlify.app` |

4. **Deploy.** Then go back to **Step 3.3** and set the Paystack webhook URL.

## Step 6 — Test it 🎉

1. Open your site → **Start free** → sign up → you should see **12 credits**.
2. Type a prompt → **Generate** → an image appears, credits drop.
3. **Top up** → pick a pack → **Pay with transfer** on Paystack → after payment,
   credits increase automatically (via the webhook).
4. On your phone: browser menu → **Add to Home Screen** → it installs like an app. 📲

---

## Tuning your business 💰

- **Free trial size:** change `12` in `supabase/schema.sql` (the `handle_new_user`
  function and the `profiles.credits` default), re-run the query.
- **Prices & credits:** edit **`netlify/functions/_packs.js`** (the source of
  truth) **and** mirror them in **`app/config.js`** for display.
- **Credits per image by model:** `MODEL_COST` in `netlify/functions/_packs.js`.
- Keep credit prices comfortably above what MuAPI charges per image (shown as
  `cost_usd` on each generation in your Supabase `generations` table) so every
  generation is profitable.

## Going live checklist ✅
- [ ] Schema run in Supabase
- [ ] `app/config.js` filled with Supabase URL + anon key
- [ ] All 6 env vars set in Netlify
- [ ] Paystack switched to **live** keys + webhook URL set
- [ ] Test signup → generate → pay → credits added

## Later / optional
- **Video generation** — the backend is structured to add it (a video model +
  credit cost); say the word.
- **App Store / Play Store** — we can wrap this same PWA so it's listed in the
  stores (no rebuild).
- **Google login** — can be added in Supabase Auth in a few minutes.
