// ============================================================
// The $500 Week — AI UGC & AI Influencer income course (hosted in Fuse Studio).
// A separate, self-contained course from Fuse Atelier. 7 days of text lessons
// plus 3 video walkthroughs (Day 2, 3, 5). Rendered by openWeek() in app.js.
//
// Access:  full-plan/admin  OR  a valid access code (given after you manually
//          grant them in Admin -> "Unlock course for this email")  OR
//          unlocked with in-app credits.  First step after access is the
//          WhatsApp-group gate.
//
// Payment: buyers tap "Message me on WhatsApp" (prefilled purchase message,
// same as the landing page) -> you send account details -> they pay -> you
// take their email -> Admin panel -> "Unlock course for this email". No
// Selar right now.
//
// Video slots: set a URL per day key ('wk-2','wk-3','wk-5') in the course_videos
// table (same admin flow as Atelier) and it appears automatically. Until then a
// "coming soon" placeholder shows and the text lesson still works.
// ============================================================
window.FUSE_5WEEK = {
  price: 5000,                  // ₦ course price
  buyWhatsapp: 'https://wa.me/2349044558101?text=Hi%20Ria%21%20I%20want%20to%20join%20The%20%24500%20Week%20course%20%28AI%20UGC%20%26%20AI%20Influencer%29.%20Please%20send%20me%20the%20payment%20details%20%F0%9F%99%8F',
  whatsapp: '',                 // paste your WhatsApp GROUP invite link here (separate from the buy link above)
  accessCode: 'UGC500',         // code you can hand out manually if you ever want a self-serve unlock
  creditsCost: 250,             // in-app credit price to unlock (optional path, ~ same value as ₦5,000)
  charLabUrl: 'https://fuse-character-lab.netlify.app', // Character Lab banner link

  days: [
    {
      key: 'wk-1', day: 1, title: 'What AI UGC & AI Influencer content is — and why it pays',
      dur: '12 min read', video: false,
      notes: `
        <h3>Welcome — here's what you actually paid for</h3>
        <p>Over the next 7 days you'll build one rare, high-value skill: making <b>AI UGC and AI influencer content</b> — the short, native-looking videos brands and creators pay for — and turning it into income on <b>Upwork</b> and <b>Instagram</b> inside a week.</p>
        <p>No camera. No real face needed. No filming. Just your phone and the tools inside Fuse Studio.</p>
        <div class="wk-call">💡 The goal isn't to "learn AI." It's to make your first $500. Every lesson exists only to move you toward that.</div>
        <h3>What "AI UGC" actually means</h3>
        <p><b>UGC</b> = user-generated content: the casual, authentic-looking clips that outperform polished ads. <b>AI UGC</b> is the same thing, produced with AI faces, voices and product shots — so you can create 20 pieces in the time it used to take to film one.</p>
        <p>An <b>AI influencer</b> is a consistent AI persona (a face + voice + style) that posts content and builds an audience — without ever needing a real person on camera.</p>
        <h3>Who pays for this — and how much</h3>
        <ul>
          <li><b>Upwork clients</b> — brands and agencies paying $50–$500+ per UGC video or per batch.</li>
          <li><b>Instagram</b> — you grow a page, then sell your own products, promos or shout-outs.</li>
          <li><b>Local businesses</b> — restaurants, salons, skincare brands who need ad content weekly.</li>
        </ul>
        <h3>Your 7-day map</h3>
        <ul>
          <li>Day 2 — Build your AI face / Character Lab model 🎥</li>
          <li>Day 3 — Create your first AI UGC video 🎥</li>
          <li>Day 4 — Package it as a service (Upwork profile + portfolio)</li>
          <li>Day 5 — Pitch and land your first client 🎥</li>
          <li>Day 6 — Grow on Instagram with AI content</li>
          <li>Day 7 — Scale: pricing, delivery, repeat clients</li>
        </ul>
        <p><b>Today's action:</b> introduce yourself in the WhatsApp group and write down the single income number you want by Day 7.</p>`,
    },
    {
      key: 'wk-2', day: 2, title: 'Build your AI face — the Character Lab model',
      dur: '15 min + video', video: true,
      notes: `
        <h3>Your model is your product's foundation</h3>
        <p>Everything you'll sell starts with one consistent AI character. In Fuse Character Lab you build a <b>model sheet</b> — a locked face that stays the same across every video, so your content looks like one real creator, not random AI images.</p>
        <h3>Two paths — pick one</h3>
        <ul>
          <li><b>Your own face</b> — upload a few clear selfies and Character Lab builds your consistent AI twin.</li>
          <li><b>A brand-new AI face</b> — no selfies at all. Generate a fresh persona you fully own (best if you want to stay faceless).</li>
        </ul>
        <div class="wk-call">🎥 Watch the video walkthrough above — it shows the exact taps from upload to a finished model sheet.</div>
        <h3>Steps</h3>
        <ol>
          <li>Open Fuse Character Lab (banner at the top of this page).</li>
          <li>Choose "own face" (upload photos) or "new AI face".</li>
          <li>Pick a niche/style — beauty, fashion, food, fitness, faceless-luxury.</li>
          <li>Generate the model sheet. Save it — this is your reusable identity.</li>
        </ol>
        <h3>What makes a model that sells</h3>
        <ul>
          <li>One clear niche — a "beauty creator" beats a "general AI person".</li>
          <li>Consistent face across angles (that's what the model sheet locks).</li>
          <li>Realistic skin and lighting — avoid the plastic AI look.</li>
        </ul>
        <p><b>Today's action:</b> generate one model sheet and post it in the group for feedback.</p>`,
    },
    {
      key: 'wk-3', day: 3, title: 'Create your first AI UGC video',
      dur: '18 min + video', video: true,
      notes: `
        <h3>From a still model to a scroll-stopping clip</h3>
        <p>Now you turn your Character Lab model into a moving, talking piece of content — the exact kind clients pay for.</p>
        <div class="wk-call">🎥 The video above walks through one full UGC video, start to finish.</div>
        <h3>The 3-part UGC formula</h3>
        <ol>
          <li><b>Hook (0–2s)</b> — a bold line or visual that stops the scroll.</li>
          <li><b>Value / demo (2–20s)</b> — your model shows or talks about the product.</li>
          <li><b>CTA (last 3s)</b> — "comment a word", "tap the link", "follow for more".</li>
        </ol>
        <h3>Steps in Fuse Studio</h3>
        <ol>
          <li>Take your model sheet into the image tools; place it with a product or in a scene.</li>
          <li>Animate it (image-to-video) with a short, natural motion prompt.</li>
          <li>Add a voice (Resemble AI or the in-app options) and lip-sync if it's a talking piece.</li>
          <li>Export 9:16, add captions in CapCut.</li>
        </ol>
        <h3>Batch like a pro</h3>
        <p>Once one works, change only the hook and product — you can produce 5–10 videos from the same model in an afternoon. Volume is how you hit $500.</p>
        <p><b>Today's action:</b> make one finished UGC video and drop it in the group.</p>`,
    },
    {
      key: 'wk-4', day: 4, title: 'Package it as a service — Upwork profile + portfolio',
      dur: '14 min read', video: false,
      notes: `
        <h3>Turn a skill into an offer people can buy</h3>
        <p>Clients don't buy "AI" — they buy "3 UGC ads for my skincare brand by Friday". Today you package it.</p>
        <h3>Your Upwork profile (the essentials)</h3>
        <ul>
          <li><b>Title:</b> "AI UGC Creator | Short-Form Video Ads for Brands".</li>
          <li><b>Overview:</b> lead with the result you deliver, not the tools you use.</li>
          <li><b>Portfolio:</b> the videos you made Day 3 — 3 to 6 strong pieces.</li>
          <li><b>Rate:</b> start reachable, raise it after your first 5-star review.</li>
        </ul>
        <h3>Your service menu</h3>
        <ul>
          <li>Single UGC video</li>
          <li>Pack of 3 / 5 videos (best seller)</li>
          <li>Monthly content retainer (the real money)</li>
        </ul>
        <div class="wk-call">💡 Nigerians: set up your ID/TIN properly so you keep your earnings — this is covered in the group resources.</div>
        <p><b>Today's action:</b> publish your Upwork profile with at least 3 portfolio videos.</p>`,
    },
    {
      key: 'wk-5', day: 5, title: 'Pitch and land your first client',
      dur: '16 min + video', video: true,
      notes: `
        <h3>The pitch is where the money is decided</h3>
        <p>A great video with a weak pitch gets ignored. Today you learn to write proposals that get replies — fast.</p>
        <div class="wk-call">🎥 The video above shows a real pitch being written and sent in under 5 minutes.</div>
        <h3>The winning proposal structure</h3>
        <ol>
          <li><b>Hook line</b> — reference their exact job/brand in the first sentence.</li>
          <li><b>Proof</b> — "here's a UGC video I made that fits your product" (attach one).</li>
          <li><b>The offer</b> — what they get, by when, for how much.</li>
          <li><b>One clear CTA</b> — "want me to send 2 sample cuts today?"</li>
        </ol>
        <h3>Speed wins</h3>
        <p>Apply within the first hour a job is posted. Personalise the first line. Keep it short. Attach one relevant sample. That's it.</p>
        <p><b>Today's action:</b> send 5 tailored pitches. Track replies in the group.</p>`,
    },
    {
      key: 'wk-6', day: 6, title: 'Grow on Instagram with AI content',
      dur: '13 min read', video: false,
      notes: `
        <h3>The parallel income engine</h3>
        <p>Upwork gets you paid this week. Instagram builds an audience that pays you for months. Run both.</p>
        <h3>Post like a strategist</h3>
        <ul>
          <li>Lead every reel with a strong <b>hook</b> in the first 1–2 seconds.</li>
          <li>Post consistently — your Character Lab model makes this effortless.</li>
          <li>End with a <b>comment-to-DM</b> CTA ("comment a word for the link").</li>
        </ul>
        <h3>Convert viewers to buyers</h3>
        <ul>
          <li>Optimise your bio: what you do + one clear link.</li>
          <li>Use the comment-to-DM flow to send offers automatically.</li>
          <li>Show finished work — proof sells faster than promises.</li>
        </ul>
        <p><b>Today's action:</b> post one AI UGC reel with a comment-to-DM CTA.</p>`,
    },
    {
      key: 'wk-7', day: 7, title: 'Scale — pricing, delivery, repeat clients',
      dur: '14 min read', video: false,
      notes: `
        <h3>From first sale to steady income</h3>
        <p>You've made content, packaged it, pitched it and posted it. Day 7 is about turning a one-off into a repeatable business.</p>
        <h3>Raise your prices the right way</h3>
        <ul>
          <li>After each 5-star review, nudge your rate up.</li>
          <li>Move clients from single videos to <b>monthly retainers</b> — predictable income.</li>
        </ul>
        <h3>Deliver so they come back</h3>
        <ul>
          <li>Send more than promised on the first job.</li>
          <li>Hit deadlines. Communicate clearly. Ask for the review.</li>
          <li>Offer a "next month" package before the current job ends.</li>
        </ul>
        <h3>Your next 30 days</h3>
        <p>Keep the model, keep batching, keep pitching daily. The people who win aren't the most talented — they're the most consistent.</p>
        <div class="wk-call">🎓 Ready to go deeper? Fuse Atelier is the full AI Creative Income System — ask in the group about upgrading.</div>
        <p><b>Today's action:</b> pitch the retainer to your first client, and set your 30-day income target.</p>`,
    },
  ],
};
