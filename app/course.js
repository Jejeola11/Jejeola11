// ============================================================
// Fuse Atelier 2.0 — course data. Six skill families, three tiers.
//   pillar.tier: 'starter' | 'creator' | 'empire' — the minimum tier
//   that unlocks every module in that pillar (checked in app.js).
//   Lesson keys that already have uploaded videos in course_videos are
//   PRESERVED from the old structure (orient-*, spark-*, gold-3_5) so
//   nothing needs re-linking. Every lesson follows the 4-beat formula:
//   one idea → example → action step → bridge.
// ============================================================
window.FUSE_COURSE = {
"pillars": [

{ "key": "orient", "name": "Orientation", "sub": "Start here — 20 minutes, then you create", "tier": "starter", "modules": [
{ "key": "orient-m1", "title": "Start Here", "lessons": [
{ "key": "orient-0_1", "n": "0.1", "title": "Welcome — What You Just Unlocked", "dur": "2 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🎙 Welcome</span><h4>The Idea</h4><p>Fuse Atelier is three things in one: the course (6 skill families), the studio (where you create), and the Money Engine (how you get paid). Your tier unlocks your families — and every tier includes the Money Engine.</p><div class='vault-action'><b>Action step:</b> Open the Create tab and look around for 2 minutes. Next: the one rule that makes this course work.</div>" },
{ "key": "orient-0_2", "n": "0.2", "title": "The Rule: One Skill → Money → Stack The Next", "dur": "1 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🎙 Welcome</span><h4>The Idea</h4><p>People fail courses by learning everything and selling nothing. Here you learn ONE skill (2–3 short lessons), monetize it the same week with the Money Engine, then stack the next skill. Momentum beats knowledge.</p><div class='vault-action'><b>Action step:</b> Say your commitment out loud: one skill, one week, one client. Next: your quick self-audit.</div>" },
{ "key": "orient-0_3", "n": "0.3", "title": "Your Starter Audit", "dur": "2 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🎙 Welcome</span><h4>The Idea</h4><p>Rate yourself 1–5 on: AI tools, design eye, selling confidence, and consistency. No wrong answers — this tells you which lessons to slow down on. You'll re-rate at day 30 and shock yourself.</p><div class='vault-action'><b>Action step:</b> Write your 4 ratings somewhere you'll find them again. Next: meet the studio.</div>" },
{ "key": "orient-0_4", "n": "0.4", "title": "Meet Your Studio (Make Your First Image Now)", "dur": "4 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>A 3-minute tour of Fuse Studio — Image, Video, Avatar, Reactor — ending with YOU generating your first image. The tool is included in your tier; your credits are already loaded.</p><div class='vault-action'><b>Action step:</b> Generate one image of anything. Post it in the community. You're officially a creator. Next: pick your first money skill.</div>" },
{ "key": "orient-0_5", "n": "0.5", "title": "Pick Your First Skill (60-Second Quiz)", "dur": "3 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🎙 Welcome</span><h4>The Idea</h4><p>Fastest money for most people: flyers (every business needs them). Have product-seller friends? Start with product photography. Love video? AI UGC. Pick with your gut — you'll stack the others later anyway.</p><div class='vault-action'><b>Action step:</b> Open your chosen family and start lesson 1 TODAY, not tomorrow. The WhatsApp coach will hold you to it.</div>" }
]}
]},

{ "key": "design", "name": "DESIGN & FLYERS", "sub": "The fastest money — every business buys these", "tier": "starter", "modules": [
{ "key": "design-m1", "title": "Skill 1 · Social Media & Event Flyers", "lessons": [
{ "key": "spark-1_1", "n": "1.1", "title": "Learn It: Your Design Toolkit — Which Model For Which Job", "dur": "2 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>One studio, many engines: fast models for drafts, premium models for the final client render. Concept cheap, finish expensive — that's how pros protect their credits and their margins.</p><div class='vault-action'><b>Action step:</b> Generate the same flyer concept on two models and compare. Next: the prompt formula that makes designs look professional.</div>" },
{ "key": "spark-1_2", "n": "1.2", "title": "Build It: The 6-Part Prompt Formula", "dur": "7 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Subject + Material + Lighting + Camera + Atmosphere + Quality. Stack all six in one flowing sentence and you get professional output on the first try. Example: 'Bold party flyer design for a Lagos beach party, vibrant sunset colours, clean modern typography space, energetic premium look, ultra-detailed, 4:5.'</p><div class='vault-action'><b>Action step:</b> Write one full 6-part prompt for an event flyer and generate it. Next: turning designs into deliverables clients pay for.</div>" },
{ "key": "design-1_3", "n": "1.3", "title": "Sell It: Flyer Packages Clients Pay ₦3k–15k For", "dur": "6 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Sell packages, not one-offs: single flyer ₦3,000–5,000 · flyer + WhatsApp status version ₦7,000 · monthly pack ₦15,000+. Deliver same-day — speed is your unfair advantage over designers who take a week.</p><div class='vault-action'><b>Action step:</b> Make 3 portfolio flyers (party, business promo, product sale) — these are your proof pieces. Then open the Money Engine and run Day 1.</div>" }
]},
{ "key": "design-m2", "title": "Skill 2 · Ad Flyers & Promo Graphics", "lessons": [
{ "key": "design-2_1", "n": "2.1", "title": "Learn It: Ads That Sell vs Designs That Decorate", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>An ad flyer has one job: make the viewer act. Hook (big claim), offer (the deal), action (call/DM now) — everything else is decoration. Businesses pay for the structure, not the prettiness.</p><div class='vault-action'><b>Action step:</b> Screenshot 3 ads you've seen on WhatsApp status and identify hook/offer/action in each. Next: building them in the studio.</div>" },
{ "key": "design-2_2", "n": "2.2", "title": "Build It: Sales Banners, Price Lists & Status Ads", "dur": "8 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Build the 3 formats every Nigerian business asks for: the sales banner, the price-list design, and the WhatsApp status ad (9:16). Same 6-part formula, plus clean text space for their offer.</p><div class='vault-action'><b>Action step:</b> Make one of each format for an imaginary shop. Next: pricing and selling them as a bundle.</div>" },
{ "key": "design-2_3", "n": "2.3", "title": "Sell It: The Promo Pack Retainer", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Businesses run promos weekly — sell a monthly promo pack (4 designs, ₦10,000–20,000) instead of hunting new clients every week. One yes = recurring income.</p><div class='vault-action'><b>Action step:</b> Write your promo-pack offer in one WhatsApp message. Save it — the Money Engine playbooks will tell you exactly who to send it to.</div>" }
]},
{ "key": "design-m3", "title": "Skill 3 · Carousels & Content Packs", "lessons": [
{ "key": "design-3_1", "n": "3.1", "title": "Learn It: Why Brands Pay Monthly For Content", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Every serious brand needs 12–30 posts a month and hates making them. Carousels, quote cards and tip posts are the easiest recurring design income that exists — and AI makes you faster than any agency.</p><div class='vault-action'><b>Action step:</b> Find 2 Instagram business pages posting inconsistently — they're your future clients. Next: batch-producing a month of content.</div>" },
{ "key": "design-3_2", "n": "3.2", "title": "Build It: A Month of Content In One Afternoon", "dur": "8 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Lock one visual style (same colours, same layout family), then batch: 8 carousels + 8 quote cards + 8 promo posts. Fuse Reactor writes the captions; the studio renders the visuals; you assemble.</p><div class='vault-action'><b>Action step:</b> Produce a 6-post sample pack for one of the pages you found. That sample IS your pitch. Next: closing the retainer.</div>" },
{ "key": "design-3_3", "n": "3.3", "title": "Sell It: Closing ₦15k–50k Monthly Retainers", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Pitch with the sample attached: 'I made these 6 posts for your page already — want the full month?' Price: ₦15,000 (12 posts) to ₦50,000 (30 posts + captions). Retainers compound: 3 clients = steady salary.</p><div class='vault-action'><b>Action step:</b> Send the sample pack to both pages using the DM script from the Money Engine. Congratulations — you now have a pipeline.</div>" }
]}
]},

{ "key": "brand", "name": "BRAND IDENTITY", "sub": "Premium packages — logos, kits and voice", "tier": "creator", "modules": [
{ "key": "brand-m1", "title": "Skill 4 · Logo & Brand Kits", "lessons": [
{ "key": "brand-1_1", "n": "4.1", "title": "Learn It: What A ₦50k Brand Kit Contains", "dur": "6 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Clients don't buy 'a logo' — they buy looking legit: logo + colours + fonts + brand board, packaged. Sell the kit, not the file. The packaging is why one designer charges ₦70k while another begs at ₦5k.</p><div class='vault-action'><b>Action step:</b> Collect 3 brand kits you admire (search 'brand board'). Next: generating logo directions in minutes.</div>" },
{ "key": "brand-1_2", "n": "4.2", "title": "Build It: Logo Directions & The Full Kit", "dur": "9 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Generate 3 distinct logo directions (wordmark, icon, badge), refine the winner, extract the palette, pair two fonts, and assemble the brand board — all inside the studio in one sitting.</p><div class='vault-action'><b>Action step:</b> Build one complete kit for a fictional brand. Next: the presentation that makes it worth ₦50k.</div>" },
{ "key": "brand-1_3", "n": "4.3", "title": "Sell It: Present Like An Agency, Charge Like One", "dur": "6 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Present 2 directions max, on mockups (signage, business card, IG grid), with one paragraph of strategy each. Price tiers: kit ₦25k · kit + stationery ₦45k · kit + stationery + content starter pack ₦70k.</p><div class='vault-action'><b>Action step:</b> Put your fictional kit on 3 mockups. That's portfolio piece #1 for the Brand family.</div>" }
]},
{ "key": "brand-m2", "title": "Skill 5 · Brand Stationery", "lessons": [
{ "key": "brand-2_1", "n": "5.1", "title": "Learn & Build: Cards, Letterheads & Signatures", "dur": "8 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Stationery is the easiest upsell in design: business cards, letterheads, email signatures — generated from the brand kit's colours and fonts so everything matches. 30 minutes of work, ₦5k–20k added to every brand job.</p><div class='vault-action'><b>Action step:</b> Extend your fictional brand kit with a card + letterhead. Next: the words that complete a brand.</div>" },
{ "key": "brand-2_2", "n": "5.2", "title": "Sell It: The Automatic Upsell Script", "dur": "4 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>After every logo/kit delivery: 'Want me to extend this to your cards, letterhead and email signature so everything matches? ₦X if we do it this week.' Asked at the moment of delight, this closes half the time.</p><div class='vault-action'><b>Action step:</b> Save the upsell script into your phone's quick replies. It will pay you for years.</div>" }
]},
{ "key": "brand-m3", "title": "Skill 6 · Brand Voice & Captions", "lessons": [
{ "key": "brand-3_1", "n": "6.1", "title": "Learn & Build: Bios, Taglines & 30-Day Calendars", "dur": "8 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Fuse Reactor writes what the brand sounds like: bio, tagline, tone rules, and a 30-day content calendar. Words are the invisible half of branding — and almost nobody in your market sells them properly.</p><div class='vault-action'><b>Action step:</b> Generate a voice pack for your fictional brand. Next: bundling words + visuals into one premium offer.</div>" },
{ "key": "brand-3_2", "n": "6.2", "title": "Sell It: The Complete Brand Package", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Kit + stationery + voice + content starter = 'everything a new business needs to launch, in one week' — ₦70k–150k depending on the client. You are no longer a designer; you're a launch partner.</p><div class='vault-action'><b>Action step:</b> Write your complete-package offer as one page. New businesses register every day — the Money Engine shows you where they announce themselves.</div>" }
]}
]},

{ "key": "product", "name": "PRODUCT & E-COMMERCE", "sub": "Sellers pay for photos that sell things", "tier": "creator", "modules": [
{ "key": "product-m1", "title": "Skill 7 · AI Product Photography", "lessons": [
{ "key": "spark-2_1", "n": "7.1", "title": "Learn It: What Clients Actually Pay For", "dur": "2 min", "aspect": "16:9",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Brands need shots for their website, IG grid, ads and packaging — studio photography costs hundreds of dollars per shot. You deliver the same from one phone photo, in minutes, and still charge well.</p><div class='vault-action'><b>Action step:</b> Take one plain reference photo of any product near you. Next: turning it into a studio shot.</div>" },
{ "key": "spark-2_2", "n": "7.2", "title": "Build It: Surfaces, Environments & Brand Colours", "dur": "9 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Upload the reference photo, then prompt the world around it: marble counter with soft morning light, or a bold colour-matched backdrop. The product stays accurate because it's grounded in a real image. Match backdrops to the client's brand colour — consistency beats prettiness.</p><div class='vault-action'><b>Action step:</b> Generate 3 context variations of your product: luxury, bold brand-colour, outdoor lifestyle. Next: premium finishes and delivery.</div>" },
{ "key": "spark-2_3", "n": "7.3", "title": "Sell It: Beauty & Luxury Renders + Client Delivery", "dur": "21 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>The premium tier: beauty/luxury lighting, water splashes, floating products — plus how to deliver: upscaled, in a named folder, with a one-line usage guide. Charge ₦2k–5k per finished shot, ₦10k–40k per campaign set.</p><div class='vault-action'><b>Action step:</b> Produce a 5-shot set for one product and package it like a delivery. That's your Product-family portfolio piece.</div>" }
]},
{ "key": "product-m2", "title": "Skill 8 · Product Ads & Campaign Shots", "lessons": [
{ "key": "product-2_1", "n": "8.1", "title": "Learn & Build: Lifestyle Scenes & Seasonal Campaigns", "dur": "8 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>A product photo shows the thing; a campaign shot shows the life around it — the woman wearing the scarf at a rooftop dinner, the drink sweating on a beach table. Seasonal hooks (Detty December, Valentine's, back-to-school) sell campaign SETS, not singles.</p><div class='vault-action'><b>Action step:</b> Take your product from 7.3 and build 3 lifestyle scenes around one season. Next: pricing campaign work.</div>" },
{ "key": "product-2_2", "n": "8.2", "title": "Sell It: Campaign Sets & The Seasonal Calendar", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Pitch 6 weeks before each season: 'Your Valentine's campaign, done this week — 6 shots, ₦25k.' Sellers plan late; you show up early with samples. The seasonal calendar = 6 guaranteed pitch moments a year.</p><div class='vault-action'><b>Action step:</b> Mark the next 3 Nigerian retail seasons in your calendar with a pitch reminder 6 weeks out.</div>" }
]},
{ "key": "product-m3", "title": "Skill 9 · Packaging & Label Design", "lessons": [
{ "key": "product-3_1", "n": "9.1", "title": "Learn & Build: Labels, Boxes & Pouch Mockups", "dur": "9 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Small brands going premium need packaging: label design, box/pouch mockups, shelf-ready looks. Generate the design, place it on realistic mockups, and hand them print-ready direction.</p><div class='vault-action'><b>Action step:</b> Design one label and show it on 2 mockups. Next: who buys this and at what price.</div>" },
{ "key": "product-3_2", "n": "9.2", "title": "Sell It: The ₦20k–80k Packaging Package", "dur": "4 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Targets: skincare, food brands, supplements moving from nylon to premium. Price label-only ₦20k, full packaging suite ₦50k–80k. Pair with the Brand family for launch-partner money.</p><div class='vault-action'><b>Action step:</b> List 5 small product brands you know personally whose packaging undersells them. That's a pitch list.</div>" }
]},
{ "key": "product-m4", "title": "Skill 10 · CGI Ads", "lessons": [
{ "key": "product-4_1", "n": "10.1", "title": "Learn It: Why 'Impossible' Ads Go Viral", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>A giant perfume bottle landing in Lekki traffic stops thumbs. CGI ads are shareable BECAUSE they're impossible — brands pay for the attention, not the video. One viral CGI ad is a client magnet for you too.</p><div class='vault-action'><b>Action step:</b> Watch 3 CGI ads (search 'CGI ad' on TikTok) and note the pattern: real location + impossible product event. Next: making one.</div>" },
{ "key": "product-4_2", "n": "10.2", "title": "Build & Sell It: Your First CGI Ad", "dur": "10 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Generate the real-location base shot, prompt the impossible event around the product, animate with a video model, add sound design. Deliver as 9:16. Charge ₦50k–200k — this is spectacle work, price it like spectacle.</p><div class='vault-action'><b>Action step:</b> Make one CGI ad for a brand you love, post it and tag them. This exact move has landed people retainers.</div>" }
]}
]},

{ "key": "video", "name": "VIDEO & MOTION", "sub": "The dollar skills — UGC, avatars and ads", "tier": "creator", "modules": [
{ "key": "video-m1", "title": "Skill 11 · AI UGC Ads", "lessons": [
{ "key": "video-1_1", "n": "11.1", "title": "Learn It: Why Brands Pay $50–150 Per UGC Video", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Brands burn money on ads; authentic-looking testimonial videos convert best; real creators are slow and expensive. AI UGC = you deliver the winning format at scale, without being on camera. This is the most in-demand dollar skill in this course.</p><div class='vault-action'><b>Action step:</b> Watch 3 UGC ads on any brand's IG. Note the structure: hook → problem → product → result. Next: building yours.</div>" },
{ "key": "spark-5_4", "n": "11.2", "title": "Build It: Create Your First AI UGC Video (Full Tutorial)", "dur": "11 min",
"notes": "<span class='vault-tag'>🎙 Talking head — full recorded walkthrough</span><h4>The Idea</h4><p>The complete start-to-finish build: script, AI presenter, generation and polish — one watch-along tutorial.</p><div class='vault-action'><b>Action step:</b> Build your own first UGC clip while you watch. Next: selling it in packs.</div>" },
{ "key": "video-1_3", "n": "11.3", "title": "Sell It: Hook Variations & The 3-Pack Offer", "dur": "6 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Performance marketers A/B test hooks — so sell 3 hook variations of ONE ad, not 3 different ads. Offer: 3-pack $99–150 intro, $50+ per extra variation. Deliver in 48h and you'll be rehired monthly.</p><div class='vault-action'><b>Action step:</b> Produce 2 more hooks for your 11.2 video. You now have a sellable UGC 3-pack — the Money Engine's foreign-client playbook shows you who wants it.</div>" }
]},
{ "key": "video-m2", "title": "Skill 12 · Clone Yourself — Hyper-Real Avatar Videos", "lessons": [
{ "key": "spark-3_4", "n": "12.1", "title": "Learn It: Your Consistent AI Face", "dur": "12 min",
"notes": "<span class='vault-tag'>🎙 Talking head — full recorded walkthrough</span><h4>The Idea</h4><p>Build your consistent AI face in Avatar Studio — the model-sheet method that keeps your face locked across every future generation. This is the foundation the hyper-real clone builds on.</p><div class='vault-action'><b>Action step:</b> Build your model sheet while you watch. Next: the realism jump.</div>" },
{ "key": "video-2_2", "n": "12.2", "title": "Build It: The One-Video Clone (So Real It's Scary)", "dur": "10 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Upload one clean photo or short clip + an audio track → InfiniteTalk generates a new talking video of YOU, in any scene, saying anything — full posture, expression and identity preserved, up to 10 minutes long. Use it for your own content (no more recording every video), and sell it as a premium service to personal brands who want daily presence without daily filming.</p><p>For work where realism has to be undetectable — a client contract, a big brand — the premium route is HeyGen's Avatar V, the most realistic engine that exists right now (a documented fix for the 'identity drift' that makes AI clones look off over a full video). It costs more, so save it for the jobs where that difference actually matters.</p><h4>Ria's Shortcut</h4><p>Good light and a plain background on your ONE source clip matters more than anything else — that single recording is what every future video is built from, so don't rush it.</p><div class='vault-action'><b>Action step:</b> Record one clean 30–60 second video of yourself talking to camera (good light, clear audio, plain background). That's your clone source for life. Next: monetizing it.</div>" },
{ "key": "video-2_3", "n": "12.3", "title": "Sell It: Content Systems For Faceless CEOs", "dur": "6 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Busy founders and creators want daily video presence without recording daily. Sell 'your month of talking videos from one recording' — $100–500/month per client. Two clients = real salary.</p><div class='vault-action'><b>Action step:</b> List 3 personal brands you follow who post inconsistently. They are the pitch list for this skill.</div>" }
]},
{ "key": "video-m3", "title": "Skill 13 · Advert Videos", "lessons": [
{ "key": "video-3_1", "n": "13.1", "title": "Learn & Build: Script → Scenes → Cut", "dur": "9 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>A full short-form ad: Reactor writes the 20-second script, you generate each 5–8s scene, then stitch with cuts and music in CapCut. Short clips generate more reliably than long takes — always build in pieces.</p><div class='vault-action'><b>Action step:</b> Make one 20-second ad for any local business, start to finish. Next: pricing video work.</div>" },
{ "key": "video-3_2", "n": "13.2", "title": "Sell It: ₦30k–150k Per Ad", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Local businesses pay ₦30k–80k per finished ad; foreign clients $100–300. Sell in campaign bundles (3 ads, 3 formats) and include one revision round — scope creep is the killer, the contract templates protect you.</p><div class='vault-action'><b>Action step:</b> Send your 13.1 ad to that business with the walk-in/DM script. Real pitch, real practice.</div>" }
]},
{ "key": "video-m4", "title": "Skill 14 · Cinematic Brand Films", "lessons": [
{ "key": "video-4_1", "n": "14.1", "title": "Learn & Build: Direct Like A DP", "dur": "10 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Premium storytelling: camera language (lens, movement, light), scene continuity, and a 45–60s brand film structure — arrival, world, product, feeling. This is agency-tier work from your phone.</p><div class='vault-action'><b>Action step:</b> Storyboard 6 shots for a brand you love, generate 3 of them. Next: who pays ₦100k+ for this.</div>" },
{ "key": "video-4_2", "n": "14.2", "title": "Sell It: The ₦100k+ Brand Film Pitch", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Targets: hotels, real estate, restaurants, fashion labels — businesses that sell a feeling. Pitch with a 15-second spec teaser of THEIR brand. Price: ₦100k–400k. One film a month changes your life.</p><div class='vault-action'><b>Action step:</b> Make one 15-second spec teaser for a local premium business. That teaser is your Empire-level calling card.</div>" }
]}
]},

{ "key": "web", "name": "WEB & FUNNELS", "sub": "Premium builds — pages, emails and wow-sites", "tier": "empire", "modules": [
{ "key": "web-m1", "title": "Skill 15 · Landing Pages", "lessons": [
{ "key": "web-1_1", "n": "15.1", "title": "Learn & Build: The One-Day Business Page", "dur": "10 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>The DemoForge method: hero, services, proof, contact — built and deployed in a day with AI doing the heavy lifting. The secret to selling them: build the demo BEFORE the pitch and send the live link.</p><div class='vault-action'><b>Action step:</b> Build one demo page for a real local business. Next: the pitch that converts demos into deposits.</div>" },
{ "key": "web-1_2", "n": "15.2", "title": "Sell It: ₦50k–250k Per Site", "dur": "6 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>'I already built your new site — want it?' beats every cold pitch ever written. Price: one-pager ₦50k–100k, multi-section ₦150k–250k, hosting/care ₦5k–10k monthly (recurring!).</p><div class='vault-action'><b>Action step:</b> Send your demo to the business with the pitch script. This exact method has landed real contracts.</div>" }
]},
{ "key": "web-m2", "title": "Skill 16 · Email Design & Sequences", "lessons": [
{ "key": "web-2_1", "n": "16.1", "title": "Learn & Build: Welcome & Sales Sequences", "dur": "9 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Businesses with audiences need emails: the 5-email welcome sequence and the sales sequence. Reactor drafts, you polish with brand voice, design clean layouts. Monthly retainer work by nature.</p><div class='vault-action'><b>Action step:</b> Write a 3-email welcome sequence for your fictional brand. Next: packaging email as a service.</div>" },
{ "key": "web-2_2", "n": "16.2", "title": "Sell It: ₦20k–80k Monthly Email Retainers", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Target: anyone selling online with a customer list they ignore. Offer: 4 emails/month ₦20k, 8 + design ₦50k–80k. Emails print money for clients, so renewals are automatic.</p><div class='vault-action'><b>Action step:</b> Add email as a line item to your complete-brand package. Bundles close bigger.</div>" }
]},
{ "key": "web-m3", "title": "Skill 17 · Interactive 'Wow' Pages", "lessons": [
{ "key": "web-3_1", "n": "17.1", "title": "Learn & Build: Scroll Magic & Cursor Effects", "dur": "11 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Image-reveal heroes, scroll-triggered video, mouse-scrub galleries — the effects that make a page feel expensive. You build them with AI from proven module specs; the Fuse Atelier sales page itself is your reference build.</p><div class='vault-action'><b>Action step:</b> Rebuild the image-reveal hero for your own portfolio page. Next: charging premium for premium.</div>" },
{ "key": "web-3_2", "n": "17.2", "title": "Sell It: The ₦150k+ Signature Site", "dur": "5 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Interactive sites are for clients who sell status: premium brands, creators, event companies. Minimum ₦150k. Show, don't tell — your own wow-page portfolio does the selling.</p><div class='vault-action'><b>Action step:</b> Ship your own interactive portfolio page. It's simultaneously your proof, your pitch, and your product.</div>" }
]}
]},

{ "key": "money", "name": "THE MONEY ENGINE", "sub": "In every tier — the road from skill to salary", "tier": "starter", "modules": [
{ "key": "money-m1", "title": "Skill 18 · The First-Client System (7 Days)", "lessons": [
{ "key": "money-1_1", "n": "18.1", "title": "The 7-Day Plan, Day By Day", "dur": "8 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Day 1 set up shop + pick skill · Day 2 build 3 proof pieces · Day 3 first 10 outreach messages · Days 4–5 follow up + keep sending · Day 6 close & deliver · Day 7 raise price + repeat. The WhatsApp coach walks you through each day and confirms every action.</p><div class='vault-action'><b>Action step:</b> Message the coach bot 'DAY 1' to activate your plan. From here, the system carries you.</div>" },
{ "key": "money-1_2", "n": "18.2", "title": "Your Proof Pieces & Simple Portfolio", "dur": "6 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>Nobody hires without proof — so manufacture it: 3 pieces in your skill for imaginary (or real local) businesses, arranged in a clean WhatsApp catalog + one Google Drive folder. That's a portfolio. Done beats perfect.</p><div class='vault-action'><b>Action step:</b> Assemble your 3 pieces into your catalog today. The coach will ask to see it.</div>" }
]},
{ "key": "money-m2", "title": "Skill 19 · Client Playbooks (Every Channel That Works)", "lessons": [
{ "key": "money-2_1", "n": "19.1", "title": "WhatsApp, Facebook & Walk-Ins (Fastest Naira)", "dur": "9 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>WhatsApp: status posts + business catalog + direct pitches to contacts who run businesses. Facebook: Nigerian business-owner groups (value first, pitch second). Walk-ins: redesign THEIR flyer/signage before you enter, show it on your phone, first job ₦2k–3k same-day. These three convert in 1–5 days.</p><div class='vault-action'><b>Action step:</b> Post your first before/after on status + join 2 business groups + pick one shop for a walk-in tomorrow.</div>" },
{ "key": "money-2_2", "n": "19.2", "title": "Instagram & TikTok (The Inbound Engine)", "dur": "8 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>IG: 10–15 personalized DMs daily WITH a pre-made sample for that exact business — the sample collapses the trust barrier. TikTok: one transformation post daily ('I made this ad with AI in 4 minutes') seeds inbound clients within weeks.</p><div class='vault-action'><b>Action step:</b> Send your first 10 sample-attached DMs using the vault scripts. Reply DONE to the coach when sent.</div>" },
{ "key": "money-2_3", "n": "19.3", "title": "Foreign & Diaspora Clients (The Dollar Playbook)", "dur": "9 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Diaspora businesses (African restaurants, hair shops, event planners in the US/UK) pay in dollars and refer within tight networks. Find them on Google Maps + IG, make a free redesign of their flyer/menu/product photo, email or DM it attached with a 2-line pitch. Personalized samples lift replies 2–3x.</p><div class='vault-action'><b>Action step:</b> Find 5 diaspora businesses and make one free sample for the best one. Send it tonight.</div>" }
]},
{ "key": "money-m3", "title": "Skill 20 · Upwork, Taught From 12 Real Wins", "lessons": [
{ "key": "money-3_1", "n": "20.1", "title": "The Profile & Gigs That Landed 12 Jobs", "dur": "9 min",
"notes": "<span class='vault-tag'>🖥 Screen</span><h4>The Idea</h4><p>A teardown of the exact Upwork profile that earned $3,000+: the headline, the portfolio pieces, the niche positioning. Honest framing: Upwork is a weeks-2–4 channel, not a day-1 channel — build it while your local pipeline pays the bills.</p><div class='vault-action'><b>Action step:</b> Set up your profile copying the structure (not the words). Next: the proposals that won.</div>" },
{ "key": "gold-3_5", "n": "20.2", "title": "Pitch And Land Your First Client (Full Walkthrough)", "dur": "15 min",
"notes": "<span class='vault-tag'>🎙 Talking head — full recorded walkthrough</span><h4>The Idea</h4><p>The complete recorded walkthrough of pitching and landing a real client — the proposal structure, the free-sample hook, the close.</p><div class='vault-action'><b>Action step:</b> Send one real proposal using the approach shown, then post your experience in the community.</div>" },
{ "key": "money-3_3", "n": "20.3", "title": "Get Paid & Scale: Dollars, Pricing, Retainers", "dur": "8 min",
"notes": "<span class='vault-tag'>🎙 Voice</span><h4>The Idea</h4><p>Receiving dollars in Nigeria: Grey or Raenest for direct clients (free USD accounts, ~1% fees), Payoneer for marketplaces. Pricing ladders in ₦ and $. The retainer conversation that turns one job into monthly income. Nobody else teaches this part — it's why our students actually keep their money.</p><div class='vault-action'><b>Action step:</b> Open your Grey/Raenest account today (it's free) so a dollar client can never catch you unready.</div>" }
]}
]}

]};
