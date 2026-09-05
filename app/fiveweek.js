// ============================================================
// The $500 Week — AI UGC & AI Influencer income course (hosted in Fuse Studio).
// A separate, self-contained course from Fuse Atelier. 7 days of text lessons
// plus 3 video walkthroughs (Day 2, 3, 5). Rendered by openWeek() in app.js.
//
// This course is the full replacement for the old $500 Week ebook — every
// template, script, table and checklist that used to live in the PDF now
// lives here, rewritten for Fuse Studio's tools (Avatar Studio, Nano Banana,
// Fuse Character Lab, Fuse Reactor) instead of the old external tool stack
// (Ideogram / Kling / Claude).
//
// Access:  full-plan/admin  OR  a valid access code (Admin -> "Unlock course
//          for this email", for manual corrections/comps only)  OR  unlocked
//          with in-app credits.  First step after access is the
//          WhatsApp-group gate (that's the course *community*, not payment).
//
// Payment: buyers tap "Pay & unlock instantly" -> Paystack checkout (see
// _packs.js's 'wk_course' pack) -> paystack-webhook.js unlocks 'wk-course'
// in module_unlocks the moment payment confirms, same flow as every other
// pack/course on Fuse Studio. No more manual WhatsApp-then-Admin-grant step.
//
// Video slots: set a URL per day key ('wk-2','wk-3','wk-5') in the course_videos
// table (same admin flow as Atelier) and it appears automatically. Until then a
// "coming soon" placeholder shows and the text lesson still works.
// ============================================================
window.FUSE_5WEEK = {
  // 10 Aug 2026: was 5000 -- this was showing ₦5,000 to buyers while
  // _packs.js's wk_course (the pack checkout actually charges against) was
  // already ₦10,000, confirmed as the real price WhatsApp buyers pay. Fixed
  // to match -- a buyer was seeing one price and being charged another.
  price: 10000,                 // ₦ course price -- must match _packs.js's 'wk_course' entry
  whatsapp: 'https://chat.whatsapp.com/JMVhLvgCs40JXtNv7Yf1zI?s=cl&p=a&mlu=1&amv=2', // course discussion group (community, not payment)
  accessCode: 'UGC500',         // code you can hand out manually if you ever want a self-serve unlock
  creditsCost: 65,               // in-app credit price to unlock (optional path, ~ same ₦10,000 value at the new ₦154/credit baseline)
  charLabBuyUrl: 'https://fusecharacterlabpage.vercel.app/', // purchase / sales page (Day 2 banner + promo card)
  charLabLoginUrl: 'https://fuse-character-lab.vercel.app/', // the actual tool — only unlocks for buyers' emails
  pitchPilotUrl: 'https://pitch-pilot2.vercel.app/', // Day 5 + Day 6 banner — sign up free, 3 free pitches
  landingUrl: 'https://500-dollar-week.vercel.app', // sales page shown to locked users
  dayCredits: 50, // credits to unlock a single day (must match KEY_COST in unlock-module.js)
  // Default lesson videos (overridable per-day in Admin via course_videos).
  dayVideos: {
    'wk-2': 'https://youtu.be/ezhNZtSZVDo?si=RSFSkzjlCM3wb5wW',
    'wk-3': 'https://youtu.be/MwfxFIkJWJ4?si=icDIL5LJRPVMgrxs',
    'wk-5': 'https://youtu.be/F7jFea3e4ok?si=jQDfim8_o29qe2W_',
  },

  days: [
    {
      key: 'wk-1', day: 1, title: 'What AI UGC & AI Influencer content is — and why it pays',
      dur: '12 min read', video: false,
      notes: `
        <h3>Welcome — here's what you actually paid for</h3>
        <p>Over the next 7 days you'll build one rare, high-value skill: making <b>AI UGC and AI influencer content</b> — the short, native-looking videos brands and creators pay for — and turning it into income on <b>Upwork</b> and <b>Instagram</b> inside a week.</p>
        <p>No camera. No real face needed. No filming. Just your phone and the tools inside Fuse Studio.</p>
        <div class="wk-call">💡 The goal isn't to "learn AI." It's to make your first $500. Every lesson exists only to move you toward that.</div>

        <h3>Who's teaching you this</h3>
        <p>I'm Ria — an AI creative director. I create AI-generated content (UGC ads, brand identities, AI avatars, social content) for international clients and get paid in dollars. I started with zero experience, zero following and zero clients. Since then I've closed <b>12 Upwork contracts totaling over $7,170</b> — including a $3,500 active retainer for AI character creation for a finance brand — all with AI content that brands pay for. This course is the exact 7-day sprint I'd follow if I had to start over today, with $0 and no connections.</p>

        <h3>What you'll have by Day 7</h3>
        <ul>
          <li>✅ A consistent AI character you can use for any client</li>
          <li>✅ 3 polished UGC video samples in your portfolio</li>
          <li>✅ A live Upwork profile with real work to show</li>
          <li>✅ At least 10 pitches sent to real clients across multiple channels</li>
          <li>✅ Direct outreach to 5+ brands on Instagram</li>
          <li>✅ Your first invoice — $100 to $500+</li>
        </ul>

        <h3>What "AI UGC" actually means</h3>
        <p><b>UGC</b> = user-generated content: the casual, authentic-looking clips that outperform polished ads. Brands pay for UGC because it converts 2–4x better than traditional ads. <b>AI UGC</b> is the same thing, produced with AI faces, voices and product shots — so you can create 20 pieces in the time it used to take to film one. You never touch a camera, and the viewer can't tell the difference.</p>
        <p>An <b>AI influencer</b> is a consistent AI persona (a face + voice + style) that posts content and builds an audience — without ever needing a real person on camera.</p>

        <h3>Who pays for this — and how much</h3>
        <ul>
          <li><b>Upwork clients</b> — brands and agencies paying <b>$50–$500 per AI UGC video</b> depending on quality, length and budget. Full AI content packages (multiple videos + images + brand kit) go for <b>$500–$2,000+</b>.</li>
          <li><b>Instagram</b> — you grow a page, then sell your own products, promos or shout-outs.</li>
          <li><b>Local businesses</b> — restaurants, salons, skincare brands who need ad content weekly.</li>
        </ul>

        <h3>The mindset reset</h3>
        <p>You are not "trying to learn AI." You are building a freelance business that uses AI as its production tool. The skill is not "knowing how to prompt" — it's knowing what clients need and delivering it fast. The whole formula:</p>
        <div class="wk-call">Client has a problem (needs content) + You solve it with AI (fast, cheap, good) = You get paid.</div>

        <h3>Your 7-day map</h3>
        <ul>
          <li>Day 2 — Build your consistent AI face 🎥</li>
          <li>Day 3 — Create your first AI UGC video 🎥</li>
          <li>Day 4 — Package it as a service — Upwork profile + portfolio</li>
          <li>Day 5 — Pitch and land your first client 🎥</li>
          <li>Day 6 — Grow on Instagram with AI content</li>
          <li>Day 7 — Scale — pricing, delivery, repeat clients</li>
        </ul>
        <p><b>Today's action:</b> introduce yourself in the WhatsApp group and write down the single income number you want by Day 7.</p>`,
    },
    {
      key: 'wk-2', day: 2, title: 'Build your consistent AI face',
      dur: '12 min + video', video: true,
      notes: `
        <h3>Your model is your product's foundation</h3>
        <p>Everything you'll sell starts with one consistent AI character — a face that stays the same across every image and video, so your content looks like one real creator, not random AI images.</p>
        <p>This is built entirely inside <b>Fuse Studio</b>, using <b>Avatar Studio</b> (for your own face) or <b>Nano Banana</b> (for a brand-new AI face). <b>Fuse Character Lab</b> is a separate, linked tool that only helps you write the scene prompt — it doesn't train or generate your avatar itself.</p>

        <h3>Why character consistency matters</h3>
        <p>The single biggest difference between amateur AI content and professional AI UGC is consistency. Your character must look like the same person across every image and video. If the face, skin tone or body type shifts between shots, the content looks fake — and clients won't pay for fake-looking work.</p>

        <h3>Two paths — pick one</h3>
        <ul>
          <li><b>Your own face</b> — train Fuse Studio's Avatar Studio on your real photos.</li>
          <li><b>A brand-new AI face</b> — no selfies at all. Generate a fresh persona you fully own with Nano Banana (best if you want to stay faceless).</li>
        </ul>
        <div class="wk-call">🎥 Watch the video walkthrough above — it shows the exact taps for both paths, from upload to a finished, consistent avatar.</div>

        <h3>Path 1 — Your own face (Avatar Studio)</h3>
        <ol>
          <li>In Fuse Studio, open <b>Avatar Studio</b>.</li>
          <li>Upload up to 15 clear photos of your face and tap <b>Train avatar</b> (takes about 15 minutes).</li>
          <li>Once it's trained, tap your avatar, then tap <b>Generate model sheet</b> — this gives you multi-angle reference shots of your locked face.</li>
          <li>To write the scene you want (outfit, setting, lighting), open <b>Fuse Character Lab</b> and use its guided prompt builder: pick gender, ethnicity, hairstyle, look/style (e.g. editorial), setting (e.g. interior) and lighting (e.g. cinematic). It hands you a detailed prompt, a reusable <b>consistency block</b>, and a <b>negative prompt</b>.</li>
          <li>Copy that prompt back into Avatar Studio's <b>"Describe the scene"</b> field. Optionally add a reference image, choose your aspect ratio, then tap <b>Generate</b> (10 credits).</li>
        </ol>
        <p class="muted" style="font-size:13.5px">No Character Lab access? Open Fuse Reactor and ask it to write the scene prompt for you instead — it works the same way.</p>

        <h3>Path 2 — A brand-new AI face (Nano Banana)</h3>
        <ol>
          <li>Open <b>Fuse Character Lab</b> and build a full character brief: ethnicity, hairstyle, vibe/style, outfit, setting. There's also a <b>"Surprise me"</b> button if you want random variations.</li>
          <li>Copy the prompt it gives you.</li>
          <li>In Fuse Studio, open <b>Nano Banana</b> (image generation) — not Avatar Studio, since this isn't a real face.</li>
          <li>Paste the prompt, optionally add up to 5 reference images, and tap Generate.</li>
          <li>To keep this new face consistent going forward: reuse your <b>first generated image</b> as a reference image every time you generate with the same prompt. Character Lab's consistency block plus that reference image is what locks the face in place.</li>
        </ol>

        <h3>Prefer to write your own brief? Use this template</h3>
        <p>If you'd rather define the character by hand (or want to understand what Character Lab is doing for you under the hood), paste this into every prompt — it never changes. Only outfit, setting and pose change from image to image.</p>
        <div class="wk-call" style="white-space:pre-wrap">CHARACTER BRIEF TEMPLATE:
Name: [Choose a name]
Ethnicity: [Be specific — it prevents the AI from randomizing]
Age range: [e.g. "mid-20s"]
Face shape: [e.g. "oval face, high cheekbones, warm brown eyes"]
Body type: [e.g. "medium build, athletic"]
Hair: [e.g. "long dark wavy hair parted in the middle"]
Signature accessories: [e.g. "gold hoop earrings, thin gold bracelet"]
Skin tone: [e.g. "deep brown, warm undertone"]</div>
        <p class="muted" style="font-size:13.5px">Two ready-made example briefs to copy and adapt — <b>Female:</b> "A confident young woman in her mid-20s, light brown skin, oval face, high cheekbones, warm brown eyes, long dark wavy hair parted in the middle, natural makeup, small gold hoop earrings." <b>Male:</b> "A young man in his late 20s, dark brown skin, strong jawline, short fade haircut, neat trimmed beard, warm confident expression, athletic build." Generate either in 3 settings using the exact same brief every time — only the setting, outfit and pose change.</p>

        <h3>Generate 5 reference images — these become your portfolio</h3>
        <ol>
          <li><b>Home office / desk setup</b> — professional UGC, talking-head content</li>
          <li><b>Casual / lifestyle</b> — product reviews, lifestyle brands</li>
          <li><b>Outdoor / street</b> — travel, fashion, lifestyle content</li>
          <li><b>Studio / clean background</b> — beauty, skincare, product demos</li>
          <li><b>Close-up / selfie style</b> — talking-to-camera reels</li>
        </ol>
        <p class="muted" style="font-size:13.5px"><b>Quality check before proceeding:</b> look at all 5 images side by side. Can you tell it's the same person? If the face shifts significantly, regenerate using a more detailed brief. Consistency is non-negotiable — it's the skill that separates free content from paid content.</p>

        <h3>More inside Fuse Character Lab</h3>
        <ul>
          <li><b>Presets</b> — ready-made looks (e.g. "fitness coach", "rooftop") you can tap straight into the generator.</li>
          <li><b>Gallery</b> — browse styles and open any of them directly into the prompt generator.</li>
          <li><b>Guide</b> — teaches the consistency technique in more depth.</li>
          <li><b>Caption Generator</b> — upload a finished video, pick the platform, get a ready caption.</li>
        </ul>
        <p><b>Today's action:</b> generate your consistent AI face — either path — and post it in the group for feedback.</p>`,
    },
    {
      key: 'wk-3', day: 3, title: 'Create your first AI UGC video',
      dur: '11 min + video', video: true,
      notes: `
        <h3>From a still model to a scroll-stopping clip</h3>
        <p>Now you turn your consistent AI face into moving, talking pieces of content — the exact kind clients pay for.</p>
        <div class="wk-call">🎥 The video above walks through one full UGC video, start to finish.</div>

        <h3>The 3 UGC formats brands actually buy</h3>
        <ul>
          <li><b>Talking-Head Testimonial</b> — your character speaks directly to camera about a product. <b>$50–$200/video.</b></li>
          <li><b>Product Showcase / Lifestyle</b> — your character uses or displays a product in a lifestyle setting. <b>$75–$300/video.</b></li>
          <li><b>Before/After or Demo</b> — your character shows a transformation or result. <b>$100–$500/video.</b></li>
        </ul>
        <p>You're going to create one sample of each today. These three samples become your portfolio — the thing clients see before they hire you.</p>

        <h3>Step 0 — Get a real product</h3>
        <p>Grab any product around you — skincare, anything in your room — and snap it with your phone. That photo becomes your reference, and this becomes a real portfolio piece.</p>

        <h3>Step 1 — Let Fuse Reactor write both prompts</h3>
        <p>Open <b>Fuse Reactor</b>, pick <b>Claude Sonnet</b>, and <b>attach your product photo</b> so it can see exactly what you're promoting. Then prompt it:</p>
        <div class="wk-call" style="white-space:pre-wrap">"Write a 10-second UGC testimonial script for the uploaded skincare product. The speaker is a young woman in her mid-20s. She should sound natural, enthusiastic but not fake, like she's talking to a friend on FaceTime. Include a hook in the first 2 seconds, the product benefit, and a soft CTA. First I'll need a start frame of her holding the product, then the start frame will be converted to a 10-second video — give me the detailed realistic prompts for both, and include the script inside the video prompt so the video can lip-sync to it."</div>
        <p class="muted" style="font-size:13.5px">That last part matters: tell Claude to put the script <b>inside the video prompt</b> — that's what makes your avatar actually say the words.</p>
        <p>Claude hands you three things: the script, a <b>start-frame prompt</b> (your avatar holding the product) and a <b>video prompt</b> (with the script baked in). Copy both prompts.</p>

        <h3>Step 2 — Generate the start frame</h3>
        <ul>
          <li><b>Using your trained avatar:</b> open <b>Avatar Studio</b> → your avatar (your model sheet from Day 2 is saved there and reusable forever). Paste the start-frame prompt, add your <b>product photo as the reference image</b>, and add this line to the prompt: <i>"Make sure the facial identity and skin tone are exactly as the model sheet."</i> Set 9:16 and generate.</li>
          <li><b>Using an AI character (no trained avatar):</b> open <b>Nano Banana Pro / Nano Banana 2</b> and add <b>two reference images</b> — your character image (to lock the face) and your product photo. Paste the prompt and generate.</li>
        </ul>
        <p>Download the start frame once you're happy with it.</p>

        <h3>Step 3 — Turn the frame into a talking video</h3>
        <ol>
          <li>Go to <b>Create → Videos</b> and pick <b>Kling</b> (Seedance or Gemini/Veo also work — Kling has been giving the best results for this).</li>
          <li>Paste your video prompt — the one with the script inside for lip-sync.</li>
          <li>Duration: <b>10 seconds</b>. Resolution: <b>480p</b> is fine and charges less credits.</li>
          <li>Attach your downloaded start frame as the starting image — no other reference needed.</li>
          <li>Generate. You'll get your avatar speaking the script with real lip-sync.</li>
        </ol>
        <div class="wk-call">💡 <b>Make it longer with no cuts:</b> extract the END frame of your clip and use it as the START frame of the next generation — the clips join seamlessly.</div>

        <h3>Step 4 — Polish in CapCut</h3>
        <ul>
          <li>Talking too fast? Don't regenerate — just <b>reduce the speed slightly in CapCut</b> and she'll sound natural.</li>
          <li>Add captions, a trending sound, a subtle zoom, and light effects to make it pop.</li>
          <li>Export at 1080×1920 (9:16).</li>
        </ul>

        <h3>The 3-part UGC formula (check your video against it)</h3>
        <ol>
          <li><b>Hook (0–2s)</b> — a bold opening line ("Okay wait—") that stops the scroll.</li>
          <li><b>Value (middle)</b> — your model shows or talks about the product.</li>
          <li><b>CTA (last seconds)</b> — a soft recommendation ("just try it, thank me later").</li>
        </ol>

        <h3>Your other two formats (homework for the portfolio)</h3>
        <p>Today's walkthrough builds the <b>talking-head testimonial</b>. For your portfolio you'll also create a <b>product showcase</b> and a <b>before/after</b> using the exact same workflow — new prompt from Reactor, start frame, video. With all three in your portfolio, you can take clients in all three niches.</p>

        <h3>Batch like a pro</h3>
        <p>Once one video works, keep the winning prompt and change only the <b>hook</b> and the <b>product</b> — you can produce 5–10 videos on different products from the same avatar. Volume is how you hit $500.</p>
        <p class="muted" style="font-size:13.5px"><b>Portfolio quality check:</b> watch your samples on your phone, full screen, sound on. Ask yourself: "If I were a brand manager, would I pay $100 for this?" If not, regenerate the weakest one — your portfolio is your first impression.</p>
        <p><b>Today's action:</b> generate your start frame and one finished testimonial video, and submit it in the discussion group.</p>`,
    },
    {
      key: 'wk-4', day: 4, title: 'Package it as a service — Upwork profile + portfolio',
      dur: '14 min read', video: false,
      notes: `
        <h3>Turn a skill into an offer people can buy</h3>
        <p>Clients don't buy "AI" — they buy "3 UGC ads for my skincare brand by Friday". Today you package it: a portfolio, then an Upwork profile built around it.</p>

        <h3>Part 1 — Build your portfolio (in Canva, free)</h3>
        <p>Your portfolio needs exactly 5 things: (1) your 3 UGC video samples from Day 3, (2) 3–5 still images of your AI character in different settings from Day 2, (3) a one-paragraph bio, (4) your service menu + pricing, (5) contact information.</p>
        <div class="wk-call" style="white-space:pre-wrap">Canva page-by-page structure:
Page 1: Cover — "AI Content Creator | [Your Name]" + your best character image
Page 2: About — your one-paragraph bio + a character image
Page 3–5: Video samples — thumbnails with "▶ Watch Sample" + Google Drive links
Page 6: Services + Pricing
Page 7: Contact — email, Upwork profile link</div>
        <p>Upload your 3 video samples to Google Drive (free, 15GB), set sharing to "Anyone with the link can view", and use those links in your portfolio and Upwork profile. Download the Canva deck as PDF and also grab the shareable Canva link.</p>

        <h3>Pricing guide (for beginners)</h3>
        <ul>
          <li><b>1 AI UGC video (15–30 sec):</b> $50–$75 to start, $100–$200 after 3+ clients</li>
          <li><b>3-video content pack:</b> $120–$180 → $250–$500</li>
          <li><b>AI character creation (consistent):</b> $75–$100 → $150–$300</li>
          <li><b>Full AI content package (5 videos + images + character):</b> $200–$350 → $500–$1,000</li>
          <li><b>Monthly content retainer (10+ pieces/month):</b> $300–$500 → $750–$2,000</li>
        </ul>
        <div class="wk-call">💡 Start lower than the market to get your first 2–3 reviews. Once you have proof (reviews + portfolio), raise prices. Your first 3 clients are buying your FUTURE — invest in those relationships.</div>

        <h3>Part 2 — Your Upwork profile</h3>
        <p>Most freelancers write generic profiles and wonder why no one hires them. Your profile must answer ONE question in the first two lines: "What specific result do I deliver for my client?"</p>
        <p><b>Title formula:</b> "AI [Content Type] Creator | [Specific Result] for [Client Type]". Examples: <i>"AI UGC Video Creator | Scroll-Stopping Ads for E-Commerce Brands"</i> · <i>"AI Content Creator | Professional UGC Videos — No Filming Needed"</i> · <i>"AI Avatar & UGC Specialist | Faceless Content That Converts"</i></p>
        <p><b>Overview — copy and customize:</b></p>
        <div class="wk-call" style="white-space:pre-wrap">"Need high-converting UGC content but don't want to manage influencers or film yourself? I create professional AI-generated UGC videos and content that look indistinguishable from real creator content — delivered in 48 hours, not 2 weeks.

WHAT I DELIVER:
→ AI UGC testimonial videos (15–60 sec)
→ Product showcase and lifestyle content
→ Consistent AI characters tailored to your brand
→ Before/after and demo-style content
→ Full content packages (video + images + scripts)

WHY CLIENTS CHOOSE ME:
✓ Consistent, photorealistic AI characters (no uncanny valley)
✓ Fast turnaround — 48-hour delivery on most projects
✓ Revision-friendly — changes in hours, not days
✓ No influencer fees, no scheduling conflicts

I've delivered [X] projects for brands in [industries]. Let's discuss your content needs — message me to get started."</div>
        <p><b>Tags & skills to add</b> (they determine which searches you appear in): AI Content Creation · UGC · Video Production · AI Video · Content Creation · Social Media Content · Ad Creative · Short-form Video · AI Avatar · Product Photography · Brand Content · Reels · TikTok Content</p>
        <p><b>Portfolio section:</b> upload your 3 video sample thumbnails + link to your Google Drive videos, titled clearly: "AI UGC Testimonial — Skincare" / "AI Lifestyle Content — Fashion" / "AI Before/After — Wellness".</p>
        <p class="muted" style="font-size:13.5px"><b>Before you publish:</b> search "AI UGC" on Upwork and look at the top 5 freelancers. Is your profile as good as theirs? If not, refine it — your profile competes directly against these people for the same clients.</p>
        <div class="wk-call">💡 Nigerians: set up your ID/TIN properly so you keep your earnings — this is covered in the group resources.</div>
        <p><b>Today's action:</b> publish your Upwork profile with at least 3 portfolio videos, and finish your Canva portfolio deck.</p>`,
    },
    {
      key: 'wk-5', day: 5, title: 'Pitch and land your first client',
      dur: '15 min + video', video: true,
      notes: `
        <h3>The pitch is where the money is decided</h3>
        <p>A great video with a weak pitch gets ignored. Today you learn to write proposals that get replies — fast.</p>
        <div class="wk-call">🎥 The video above shows a real pitch being written and sent in under 5 minutes.</div>

        <h3>Finding the right jobs</h3>
        <p>Search Upwork for these terms, in order of conversion likelihood: <b>1. "AI UGC"</b> (direct match, highest conversion) <b>2. "UGC video"</b> (many clients are open to AI UGC but don't know it exists yet) <b>3. "AI content creation"</b> (broader, good volume) <b>4. "AI avatar"</b> (character creation specifically) <b>5. "product video"</b> (pitch AI UGC as a faster/cheaper alternative).</p>

        <h3>Red flags vs. green flags</h3>
        <ul>
          <li>✅ Budget $100+ listed &nbsp;·&nbsp; ✕ Budget under $25</li>
          <li>✅ Client has payment history &nbsp;·&nbsp; ✕ Client has $0 spent, 0 hires</li>
          <li>✅ "Looking for AI content" mentioned &nbsp;·&nbsp; ✕ "Need this in 2 hours"</li>
          <li>✅ Clear brief with brand details &nbsp;·&nbsp; ✕ Vague "I need content" with no details</li>
          <li>✅ Rating 4.5+ from past freelancers &nbsp;·&nbsp; ✕ Multiple negative reviews from freelancers</li>
        </ul>

        <h3>The proposal template — copy + customize per job</h3>
        <div class="wk-call" style="white-space:pre-wrap">Subject: Your AI UGC — delivered in 48 hours, no filming needed

Hi [Client name],

I see you're looking for [specific thing from their job post]. I specialize in exactly this — AI-generated UGC content that looks indistinguishable from real creator content, delivered in 48 hours.

HERE'S WHAT I'D CREATE FOR YOU:
→ [Specific deliverable matching their brief]
→ [Number] of UGC videos in [style they described]
→ Consistent AI character matched to your brand aesthetic
→ Full revision until you're happy

I've attached [1–2] samples similar to what you're looking for. [Link to Google Drive portfolio]

My process is simple:
1. You share your brand/product details
2. I create the character + script draft (24h)
3. You approve → I deliver final content (24h)
4. Unlimited revisions until it's perfect

Happy to hop on a quick call or answer any questions here.

Best,
[Your name]</div>
        <p class="muted" style="font-size:13.5px"><b>The secret to proposals:</b> personalize the first 2 lines. Reference something specific from THEIR job post. Generic proposals get ignored — specific ones get hired. Spend 3 minutes reading their brief before writing. Want this automated? Fuse PitchPilot reads the job for you and writes this exact pitch — plus your LinkedIn, WhatsApp, Instagram and email versions — in one tap.</p>

        <h3>Daily pitch routine (do this every day after today)</h3>
        <ol>
          <li>Open Upwork → search your 5 keywords</li>
          <li>Filter by "Posted in last 24 hours"</li>
          <li>Read each job post — skip red flags</li>
          <li>Send 3–5 personalized proposals per day</li>
          <li>Total time: 30–45 minutes/day</li>
        </ol>
        <h3>Speed wins</h3>
        <p>Apply within the first hour a job is posted. Personalise the first line. Keep it short. Attach one relevant sample. That's it.</p>

        <h3>The exact method — using Upwork as a lead source, then pitching the client directly</h3>
        <p>Here's the real move: you're not always submitting a formal Upwork proposal. You're using Upwork's job board to <b>find</b> the client, then reaching out to them <b>directly</b> — email, WhatsApp, LinkedIn, Instagram — using Fuse PitchPilot to write it. No proposal fee, no competing with 50 other applicants.</p>

        <h3>Set your Upwork search filters right</h3>
        <ul>
          <li><b>Experience level:</b> Entry + Intermediate (skip Advanced while you're starting out)</li>
          <li><b>Job type:</b> Fixed price, $100–$500 (skip hourly jobs — more competition)</li>
          <li><b>Number of proposals:</b> 10–20 (anything past 20–50 is already crowded)</li>
          <li><b>Payment verified:</b> ON — always. Never pitch an unverified client.</li>
          <li><b>Client history:</b> 1–9 hours or 10+ hours (shows they've actually hired before)</li>
        </ul>
        <p>Read the full job post before deciding — make sure it's genuinely something you can deliver.</p>

        <h3>Finding the client's real name and company</h3>
        <p>The job post itself rarely names the client or their brand — so you dig for it in the <b>feedback/reviews section</b>:</p>
        <ol>
          <li>Scroll to the reviews other freelancers left. Client names often surface in a freelancer's own review of the client — e.g. "I really enjoyed working with <b>Dennis</b>" tells you the client's first name is Dennis.</li>
          <li><b>Verify before trusting it</b> — find the same name mentioned 2–3 times across different reviews. One mention could be a fluke; three confirms it.</li>
          <li>Watch which side of the review you're reading — the one always at the top of each pair is the <b>freelancer's review of the client</b> (what you want); don't confuse it with the client's review of the freelancer.</li>
          <li>Company/brand names surface the same way — phrases like "great working with [Company]" in a review.</li>
        </ol>

        <h3>Turning a name into a full contact profile</h3>
        <ol>
          <li>Google search: <i>"[Name] founder of [Company] [Location]"</i> — the location is always shown on the job post, so you don't need to guess it.</li>
          <li>This usually surfaces their LinkedIn profile — confirm it's the right person by matching their role/company.</li>
          <li>Go to <b>contactout.com</b>, search the same name + company, and tap their profile — it surfaces their <b>email</b> and <b>phone number</b> where available, plus a direct link to their LinkedIn.</li>
          <li>Not every number is on WhatsApp — check before assuming. If it's not, you simply pitch on whichever channels you did find (e.g. just email + LinkedIn is completely fine).</li>
        </ol>

        <h3>Now bring it all into Fuse PitchPilot</h3>
        <ol>
          <li>Set up your profile + portfolio once (name, headline, offer, portfolio link, sample projects) — PitchPilot reuses this for every pitch.</li>
          <li>Paste the full job post text into the <b>Job post</b> field.</li>
          <li>Type in the client's name, company and location you found, plus anything you learned about them (their brief, tone, what they need) under "client history."</li>
          <li>If you found one of their older job posts, paste it in too — it helps PitchPilot understand their bigger picture.</li>
          <li>Tap <b>Write my 4 outreach messages</b>. You'll get a ready Email, WhatsApp, Instagram and LinkedIn message, plus a LinkedIn connect note — all personalised to that client.</li>
          <li>Copy whichever ones match the contact channels you actually found, and send. If they're not connected on LinkedIn yet, send the connect note first — once accepted, follow up with the full message.</li>
          <li>Log the pitch in your <b>Pitch Journal</b> (tick the channels you sent on) so you can track replies and outcomes — and revisit the exact text anytime from your <b>pitch history</b>.</li>
        </ol>
        <p class="muted" style="font-size:13.5px"><b>Out of free pitches and not ready to subscribe?</b> Open Fuse Reactor, paste in everything you found about the client, and ask it to write the same 4 messages by hand — it works the same way, just one extra step.</p>
        <p class="muted" style="font-size:13.5px">This really is a numbers game — the more real profiles you build and pitch, the higher your odds. Once you've pitched one lead, go straight back and find the next.</p>

        <p><b>Today's action:</b> send 5 tailored pitches — a mix of Upwork proposals and direct outreach. Track replies in the group.</p>`,
    },
    {
      key: 'wk-6', day: 6, title: 'Grow on Instagram with AI content',
      dur: '13 min read', video: false,
      notes: `
        <h3>The parallel income engine</h3>
        <p>Upwork gets you paid this week. Instagram builds an audience — and direct brand relationships — that pay you for months. Run both.</p>

        <h3>Why direct outreach wins</h3>
        <p>On Upwork, you compete with 20–50 other freelancers for each job. With direct outreach on Instagram, you compete with <b>zero</b> — because you're reaching brands that haven't posted a job yet. You're creating demand, not responding to it. This is the method that lands the biggest contracts, including retainers worth thousands a month.</p>

        <h3>Find brands that need AI UGC</h3>
        <ul>
          <li>Small-to-medium e-commerce brands (5K–100K followers) — they need content but can't afford agencies</li>
          <li>Brands that post inconsistently (gaps in their feed = they need help)</li>
          <li>Brands with good products but mediocre visuals</li>
          <li>Look in: skincare, supplements, fashion, wellness, food, SaaS</li>
        </ul>

        <h3>Also search Google Maps / Google directly — not just Instagram</h3>
        <p>Instagram isn't the only place to find brands. Real local and small businesses live on <b>Google Maps</b> too — restaurants, salons, clinics, gyms, hotels, trades, anything with a physical presence. This is entirely manual research (no AI search tool needed) — just you, Google, and your eyes:</p>
        <ol>
          <li>Open <b>Google Maps</b> and search a niche + city (e.g. "beauty salon London" or "dental clinic Birmingham"). Scroll through real listings.</li>
          <li>For each business, check: do they have a real website? Is it outdated, slow, or missing entirely (some only list a Facebook/Instagram page as their "website")? That gap is your opening.</li>
          <li>Tap into their listing/website to find their <b>email address</b> and <b>phone number</b> — most publish a contact page or "info@" address.</li>
          <li>No email listed? Search "<i>[Business name] [City] contact email</i>" on Google, or check <b>contactout.com</b> the same way you did for Upwork clients on Day 5.</li>
          <li>Note what's weak about their current site/presence — no online booking, no mobile version, ugly design, nothing at all — that becomes your opening line.</li>
        </ol>

        <h3>Create a custom sample first (15–30 minutes per brand)</h3>
        <p>This is the move that separates you from everyone else. Before you pitch, create a free sample of what you'd make for them: study their brand colors/aesthetic/products, generate one AI character image that fits their brand, create one 5–10 second video sample using their product/aesthetic. It's a 15–30 minute investment that pays back 10x.</p>

        <h3>The DM / email template</h3>
        <div class="wk-call" style="white-space:pre-wrap">DM:
Hi [Brand name] team 👋
I'm an AI content creator and I made a quick sample for [Brand name] — wanted to share it with you before anyone else:
[Attach or link your custom sample video]
This is AI-generated UGC — no influencer, no filming, no scheduling. I can create content like this for your brand at a fraction of what traditional UGC costs, with 48-hour turnaround.
If this is interesting, I'd love to chat about how it could work for your content calendar.
— [Your name]

EMAIL:
Subject: Quick sample I made for [Brand Name]
Hi [Name],
I'm an AI UGC creator and I put together a quick content sample for [Brand Name] — I think it fits your brand aesthetic perfectly.
Here's the sample: [Google Drive link]
This is fully AI-generated — no influencer coordination, no filming days, 48-hour delivery. I create UGC-style ads, testimonials and lifestyle content for e-commerce brands starting at $75/video.
Would love to chat if you're open to it. No pressure either way — the sample is yours to keep regardless.
Best,
[Your name] · [Upwork/portfolio link]</div>
        <p class="muted" style="font-size:13.5px"><b>Response-rate reality:</b> expect 1–2 replies out of 5. That's normal — most brand outreach has a 15–30% response rate. The ones who respond are warm leads. Follow up once after 3 days if no response.</p>
        <p class="muted" style="font-size:13.5px"><b>Let Fuse PitchPilot write these for you:</b> whether you found the brand on Instagram or Google Maps, open PitchPilot's outreach mode and fill in their name/business, website, what you found about them, what you're pitching, and your goal — it writes the email, WhatsApp, Instagram and LinkedIn versions in one tap, personalised to that exact brand.</p>

        <h3>Post like a strategist (grow your own page too)</h3>
        <ul>
          <li>Lead every reel with a strong <b>hook</b> in the first 1–2 seconds.</li>
          <li>Post consistently — your consistent AI character makes this effortless.</li>
          <li>End with a <b>comment-to-DM</b> CTA ("comment a word for the link").</li>
          <li>Optimise your bio: what you do + one clear link. Show finished work — proof sells faster than promises.</li>
        </ul>
        <p><b>Today's action:</b> find 5 brands (Instagram, Google Maps, or both), create 5 custom samples, send 5 DMs or emails via PitchPilot. This is the non-negotiable minimum — plus post one AI UGC reel with a comment-to-DM CTA.</p>`,
    },
    {
      key: 'wk-7', day: 7, title: 'Scale — pricing, delivery, repeat clients',
      dur: '14 min read', video: false,
      notes: `
        <h3>From first sale to steady income</h3>
        <p>You've made content, packaged it, pitched it and posted it. Day 7 is about turning a one-off into a repeatable business.</p>

        <h3>When a client says "I'm interested"</h3>
        <p>This is the moment most beginners freeze. Here's the exact conversation flow:</p>
        <ol>
          <li>Thank them and ask one question: <i>"Great! Could you share your brand guidelines or product photos so I can tailor the content to your exact aesthetic?"</i></li>
          <li>Agree on scope: <i>"For [X videos], my rate is [$Y]. I'll deliver in [48 hours] with [2 rounds of revisions]. Sound good?"</i></li>
          <li>Get payment secured first: on Upwork, the milestone system handles this. For direct clients, use Paypal, Payoneer, or request 50% upfront via bank transfer.</li>
          <li>Deliver and overdeliver: send one extra piece they didn't ask for. This earns 5-star reviews and repeat business.</li>
        </ol>

        <h3>Delivery checklist</h3>
        <ul>
          <li>☐ Videos exported at 1080×1920 (or client's requested size)</li>
          <li>☐ MP4 format, high bitrate</li>
          <li>☐ Captions embedded (if requested) or provided as a separate SRT file</li>
          <li>☐ Character images provided separately (PNG, high-res)</li>
          <li>☐ All files organized in a labeled Google Drive folder</li>
          <li>☐ Brief message: "Here's everything — let me know if you'd like any changes!"</li>
        </ul>

        <h3>After delivery — the review request</h3>
        <div class="wk-call" style="white-space:pre-wrap">"I'm so glad you're happy with the content! If you have a moment, a review on Upwork would mean the world to me — it helps other brands find me. And if you need more content in the future, I'd love to continue working together. I also offer monthly content retainers if that's useful."</div>

        <h3>Raise your prices the right way</h3>
        <ul>
          <li>After each 5-star review, nudge your rate up.</li>
          <li>Move clients from single videos to <b>monthly retainers</b> — predictable income.</li>
        </ul>

        <h3>Scaling beyond $500</h3>
        <ul>
          <li><b>First 3 clients:</b> $150–$500/month — low prices, building reviews</li>
          <li><b>After 5+ reviews:</b> $500–$1,500/month — raise prices 50%, start retainers</li>
          <li><b>After 10+ reviews:</b> $1,500–$3,500/month — premium pricing, recurring retainers, referrals</li>
        </ul>

        <h3>Deliver so they come back</h3>
        <ul>
          <li>Send more than promised on the first job.</li>
          <li>Hit deadlines. Communicate clearly. Ask for the review.</li>
          <li>Offer a "next month" package before the current job ends.</li>
        </ul>
        <p>Keep the model, keep batching, keep pitching daily. The people who win aren't the most talented — they're the most consistent.</p>

        <h3>🎓 You've done the sprint. Here's the full system.</h3>
        <p>The $500 Week taught you one real skill: AI UGC content + landing your first client. That's the doorway. <b>Fuse Atelier</b> is the complete system that turns this into a real, compounding income — not just one client, a whole creative business.</p>
        <ul>
          <li><b>THE SPARK</b> — director-level AI content: CGI ads, product visuals, 50+ premium prompts. <span class="muted">$500–$2,000/project</span></li>
          <li><b>THE HOUSE</b> — full brand identity systems: logos, social kits, packaging. <span class="muted">$500–$2,000/project</span></li>
          <li><b>THE GOLD</b> — international clients, Upwork retainers, the exact dollar-earning system. <span class="muted">$1,000–$3,500/month</span></li>
          <li><b>THE STAGE</b> — your personal brand, content funnels, ManyChat automation. <span class="muted">Compounding growth</span></li>
        </ul>
        <p>Plus 12 bonus vault resources (prompt vaults, proposal swipe files, a 90-day roadmap) and <b>83 Fuse Studio credits</b> included on day one.</p>
        <div class="wk-call">🔥 Founding price: <b>₦60,000</b> lifetime access (first 50 students) — then ₦90,000. You already proved you can do this in 7 days. Now scale it.</div>
        <a class="btn gold block" href="https://fuse-atelier.vercel.app" target="_blank" rel="noopener" style="margin-top:6px">🎬 See Fuse Atelier — join at the founding price →</a>

        <p><b>Today's action:</b> pitch the retainer to your first client, set your 30-day income target, and take a look at Fuse Atelier while the founding price is still open.</p>`,
    },
  ],
};
