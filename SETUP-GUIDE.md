# 🧭 Fuse Studio — Full Setup Guide (Supabase · Paystack · Netlify)

This is the complete, plain-English walkthrough. No coding. Take it slowly —
about **45–60 minutes** the first time. Do the parts in order.

## 🧩 The big picture (how the 3 pieces fit)
Think of your app as **3 helpers** working together:

| Helper | What it does | Cost |
|---|---|---|
| 🟢 **Supabase** | The **logins + database**. Remembers users, credits, payments. | Free to start |
| 🔵 **Paystack** | The **cashier**. Takes bank transfers → pays into **your** bank. | ~1.5% per sale |
| 🟣 **Netlify** | The **host**. Runs your website + the secure code that holds your keys. | Your $9 plan |

The **secret keys** (MuAPI, Paystack secret, Supabase service key) live only inside
**Netlify** — never in the public website. That's what keeps your money safe. 🔐

---

# PART 1 — 🟢 Supabase (logins + database)

### 1.1 Create the project
1. Go to **supabase.com** → **Sign up** (use Google for speed).
2. **New project**. Give it a name (e.g. `fuse-studio`).
3. Set a **database password** (save it somewhere — you rarely need it).
4. **Region:** pick the closest to Nigeria → **West EU (London)** or **EU (Frankfurt)**.
5. Click **Create** and wait ~2 minutes while it sets up.

### 1.2 Build the tables (run the 3 SQL files)
On the left menu click **SQL Editor → + New query**. Then, **one at a time**:
1. Open the file **`supabase/schema.sql`** from your repo, copy **everything**, paste it in, click **Run** (bottom right). You should see *Success*.
2. New query again → paste **`supabase/schema-phase2.sql`** → **Run**.
3. New query again → paste **`supabase/schema-phase3.sql`** → **Run**.

✅ That creates users, credits, payments, referrals, challenges, streaks, marketplace — everything.

### 1.3 Let new users in instantly (important!)
1. Left menu → **Authentication → Providers → Email**.
2. Turn **OFF "Confirm email"** → **Save**.
   *(This is the #1 reason logins "don't work" — with it on, people must verify
   their email before they can use the app. Off = instant access.)*

### 1.4 Copy your 3 Supabase keys
Left menu → **Project Settings (gear) → API**. Copy these (you'll paste them later):
- **Project URL** → `SUPABASE_URL`
- **anon public** key → `SUPABASE_ANON_KEY` *(safe to be public)*
- **service_role** key → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ **secret — never share**

---

# PART 2 — 🔵 Paystack (getting paid by transfer)

### 2.1 Create + verify your account
1. Go to **paystack.com** → **Create account**.
2. Complete **business verification** (BVN/ID + business details). This unlocks
   **live** payments. While waiting, you can use **Test mode** to try everything.
3. Add your **settlement bank account** (Settings → Preferences/Settlement) —
   **this is the bank account your money lands in.** 🏦

### 2.2 Get your secret key
1. **Settings → API Keys & Webhooks**.
2. Copy the **Secret Key**:
   - `sk_test_...` while testing
   - `sk_live_...` once you go live
   → this becomes `PAYSTACK_SECRET_KEY`.

### 2.3 Set the webhook (so credits add automatically)
On that same page, find **Webhook URL** and paste:
```
https://YOUR-SITE.netlify.app/.netlify/functions/paystack-webhook
```
*(You'll know your exact site address after Part 3 — come back and set this.)*
The webhook is how Paystack tells your app "payment received → add credits." Without
it, people pay but don't get credits.

### 2.4 Money channels
Bank transfer is already switched on in the code. Customers will see **"Pay with
Transfer"** at checkout, and it settles to your bank (usually next business day,
or instant if you enable instant settlement in Paystack).

---

# PART 3 — 🟣 Netlify (hosting — the part that was failing)

⚠️ **Most important fix:** your studio needs **Git deploy**, not drag-and-drop.
Drag-and-drop can't run the secure backend. Connect the repo once and everything
(landing, studio, backend) deploys together — and re-deploys automatically forever.

### 3.1 Connect your repo
1. Log into **netlify.com** → **Add new site → Import an existing project**.
2. Choose **GitHub** → authorise → pick your repo **`jejeola11/jejeola11`**.
3. **Branch to deploy:** select `claude/product-scaling-landing-page-241hei`
   *(or merge it into `main` first and pick `main`)*.

### 3.2 Build settings
- **Build command:** leave **empty**.
- **Publish directory:** `.` (just a dot).
- Click **Deploy**. The `netlify.toml` in your repo handles the rest (routing + functions).

### 3.3 Add your secret keys (environment variables)
Go to **Site configuration → Environment variables → Add a variable**, and add
each of these (values from Parts 1 & 2):

| Key | Where it came from |
|---|---|
| `SUPABASE_URL` | Part 1.4 |
| `SUPABASE_ANON_KEY` | Part 1.4 |
| `SUPABASE_SERVICE_ROLE_KEY` | Part 1.4 (secret) |
| `MUAPI_KEY` | your MuAPI key |
| `PAYSTACK_SECRET_KEY` | Part 2.2 (secret) |
| `APP_URL` | your site address, e.g. `https://fuse-studio.netlify.app` |

After adding them, go to **Deploys → Trigger deploy → Deploy site** so they take effect.

### 3.4 Find your site address & finish Paystack
Your site is at something like `https://fuse-studio.netlify.app` (rename it under
**Site configuration → Change site name** if you like). Now go back to **Part 2.3**
and set the Paystack webhook to that address.

---

# PART 4 — 🔑 Put the 2 public keys in the app
The app needs your Supabase **URL** and **anon key** in one file:
1. In your repo, open **`app/config.js`**.
2. Replace:
   ```js
   SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
   SUPABASE_ANON_KEY: 'YOUR-ANON-PUBLIC-KEY',
   ```
   with your real values from Part 1.4.
3. Save/commit — Netlify auto-redeploys.

*(These two are safe to be public. Nothing secret goes in this file.)*

---

# PART 5 — ⚙️ Optional features (turn on when ready)
- **Fuse Reactor (Claude/Gemini/ChatGPT):** make an account at **openrouter.ai**,
  add credit, copy the key, and add a Netlify env var `OPENROUTER_API_KEY`. The
  text AIs go live instantly. (Video AIs stay "coming soon" until separately wired.)
- **WhatsApp bot:** needs a **Meta WhatsApp Business** number. Add env vars
  `WHATSAPP_VERIFY_TOKEN` (any phrase you pick), `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`,
  then set the webhook in Meta to `.../.netlify/functions/whatsapp`. This one is
  advanced — ping me and I'll walk you through it when you're ready.

---

# PART 6 — ✅ Test it end-to-end
1. Open your site → **Start free** → sign up → you should see **12 credits**.
2. Go to **Create** → type a prompt → **Generate** → image appears, credits drop. 🎨
3. **Top up** → pick a pack → on Paystack choose **Pay with Transfer** → pay →
   within a few seconds your credits go up (that's the webhook working). 💸
4. On your phone: browser menu → **Add to Home Screen** → it installs like an app. 📲
5. Try **🔥 Daily reward**, **🎓 Academy bonus**, **🛒 Marketplace**, and your
   **referral link** in Profile.

---

# 🆘 Troubleshooting
- **"I can't sign up / log in"** → Supabase **Confirm email** is still ON (Part 1.3),
  or `config.js` keys are wrong/missing (Part 4).
- **"Generate says error / nothing happens"** → `MUAPI_KEY` not set in Netlify, or
  you deployed by drag-and-drop instead of Git (Part 3).
- **"I paid but got no credits"** → Paystack **webhook URL** not set, or it points to
  the wrong site address (Part 2.3). Check Paystack → Webhooks for failed deliveries.
- **"Page looks unstyled / blank"** → make sure you deployed via **Git** so the whole
  `app/` folder and `netlify.toml` are included.
- **Preview without any setup:** open the studio, tap **"👀 Just looking?"**, password
  **`FUSE-VIP`** — tours the UI without Supabase.

# 📖 Mini-glossary
- **Environment variable** = a secret setting stored safely on the server (Netlify),
  not in the public code.
- **Webhook** = one app automatically notifying another ("payment received!").
- **Anon vs service key** = anon is the public "front-desk" key; service is the
  private "master" key (server only).
- **Deploy** = publishing your latest code to the live site.
