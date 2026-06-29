// ============================================================
// Fuse Studio — public frontend config (safe to expose).
// Fill the two Supabase values after creating your project.
// ============================================================
window.FUSE = {
  SUPABASE_URL: 'https://rimsktvqmwmxchhivgmt.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJpbXNrdHZxbXdteGNoaGl2Z210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwMDEzNDEsImV4cCI6MjA5NzU3NzM0MX0.cbA2fw-WBjGLR3NGp-8_kcE2oA1NdnN-CcxaeFsrNyY',

  // Preview password — lets you (or anyone) tour the studio UI without
  // a Supabase account. Generation/payments still need a real login.
  PREVIEW_CODE: 'FUSE-VIP',

  // Naira per US dollar — for showing $ prices to foreigners (display only).
  USD_RATE: 1550,

  // ===== Payments =====
  // While Paystack business verification is pending, set mode:'manual' so buyers
  // pay by bank transfer / Selar and you unlock them with the Admin → Grant tool.
  // Flip to 'paystack' once your Paystack account is approved — nothing else changes.
  PAYMENT: {
    mode: 'manual',            // 'manual' | 'paystack'
    // Your receiving bank account (shown to buyers on the Pay screen).
    bank: { name: 'Opay', number: '9127651634', holder: 'Maryam Jejeola Owoyale' },
    // Optional Selar storefront link (leave '' to hide). Selar accepts cards/transfer, no CAC.
    selar: '',
    // WhatsApp number (international format, no +) buyers message after paying.
    whatsapp: '2349044558101',
  },

  // Buy options. Real prices are enforced server-side in netlify/functions/_packs.js.
  PACKS: [
    { key: 'creator_mo', name: 'Creator',       naira: 9000,  credits: 350,  note: 'All studios · monthly',  kind: 'sub' },
    { key: 'pro_mo',     name: 'Pro',           naira: 20000, credits: 800,  note: 'Video + AI · monthly',   kind: 'sub', featured: true },
    { key: 'agency_mo',  name: 'Agency',        naira: 75000, credits: 3500, note: 'White-label · monthly',  kind: 'sub' },
    { key: 'course',     name: 'Fuse Atelier Course', naira: 60000, credits: 500, note: 'Course + 500 credits', kind: 'course' },
    { key: 'bundle_120', name: '120 credits',   naira: 3000,  credits: 120,  note: 'Top-up · never expires', kind: 'pack' },
    { key: 'bundle_320', name: '320 credits',   naira: 7000,  credits: 320,  note: 'Top-up · best value',    kind: 'pack' },
    { key: 'bundle_750', name: '750 credits',   naira: 15000, credits: 750,  note: 'Top-up · bulk',          kind: 'pack' },
  ],

  // Creative Studios — each is a guided generator using the live engine.
  STUDIOS: [
    { key: 'generate', name: 'Generate',               icon: '✨', tag: '',         desc: 'Free-form image creation',
      template: '{input}' },
    { key: 'brand',    name: 'Brand Identity Studio',  icon: '🎯', tag: 'NEW',      desc: 'Logos, looks & brand visuals',
      template: 'professional brand identity concept for {input}, modern logo and visual style, cohesive premium color palette, clean, high-end, editorial' },
    { key: 'packaging',name: 'Packaging Design Studio',icon: '📦', tag: '',         desc: 'Product packaging mockups',
      template: 'premium product packaging design mockup for {input}, realistic studio product photography, elegant label, retail-ready, soft lighting' },
    { key: 'ugc',      name: 'UGC Creator Studio',     icon: '🎬', tag: 'TRENDING', desc: 'Scroll-stopping ad content',
      template: 'authentic UGC-style content photo of {input}, natural lighting, candid, relatable, social-media ready, shot on phone aesthetic' },
    { key: 'movie',    name: 'Movie Studio',           icon: '🎥', tag: '',         desc: 'Cinematic scenes & posters',
      template: 'cinematic film still of {input}, dramatic lighting, movie-grade color grade, depth of field, epic composition, poster quality' },
    { key: 'avatar',   name: 'AI Avatar Studio',       icon: '🧑‍🎨', tag: 'BETA',    desc: 'Your consistent character face',
      template: 'professional portrait of {input}, consistent character, studio lighting, sharp detail, identity reference',
      advanced: true },
  ],

  // ===== Model catalog (Higgsfield-style gallery) =====
  // slug must match netlify/functions/_packs.js. `sample` is a placeholder you
  // can later swap for a real sample image/video URL.
  IMAGE_MODELS: [
    { slug: 'gpt-image-2-text-to-image', name: 'GPT Image 2',   badge: 'Most realistic', credits: 7, sample: '/app/media/samples/s4.jpg' },
    { slug: 'flux-schnell-image',    name: 'Flux Schnell',   badge: 'Fast',      credits: 2,  sample: '/app/media/samples/s1.jpg' },
    { slug: 'flux-dev-image',        name: 'Flux Dev',       badge: 'Quality',   credits: 4,  sample: '/app/media/samples/s4.jpg' },
    { slug: 'nano-banana',           name: 'Nano Banana',    badge: 'Google',    credits: 7,  sample: '/app/media/samples/s3.jpg' },
    { slug: 'nano-banana-2',         name: 'Nano Banana 2',  badge: 'Google',    credits: 7,  sample: '/app/media/samples/s2.jpg' },
    { slug: 'qwen-image',            name: 'Qwen Image',     badge: 'Alibaba',   credits: 4,  sample: '/app/media/samples/s5.jpg' },
    { slug: 'flux-2-pro',            name: 'Flux 2 Pro',     badge: 'Best',      credits: 8,  sample: '/app/media/samples/s6.jpg' },
    { slug: 'seedream-5.0',          name: 'Seedream 5.0',   badge: 'ByteDance', credits: 5,  sample: '/app/media/samples/s3.jpg' },
    { slug: 'hunyuan-image-3.0',     name: 'Hunyuan 3.0',    badge: 'Tencent',   credits: 5,  sample: '/app/media/samples/s2.jpg' },
    { slug: 'hunyuan-image-2.1',     name: 'Hunyuan 2.1',    badge: 'Tencent',   credits: 4,  sample: '/app/media/samples/s5.jpg' },
    { slug: 'google-imagen4-ultra',  name: 'Imagen 4 Ultra', badge: 'Google',    credits: 10, sample: '/app/media/samples/s1.jpg' },
    { slug: 'hidream_i1_full_image', name: 'HiDream',        badge: 'HiDream',   credits: 5,  sample: '/app/media/samples/s6.jpg' },
  ],
  VIDEO_MODELS: [
    { slug: 'grok-imagine-text-to-video',           name: 'Grok Imagine',    badge: 'Cheapest',  credits: 15, sample: '/app/media/samples/vid2.mp4' },
    { slug: 'seedance-2-mini-text-to-video',        name: 'Seedance 2 Mini', badge: 'Fast',      credits: 38, sample: '/app/media/samples/vid1.mp4' },
    { slug: 'kling-v3-turbo-standard-text-to-video', name: 'Kling Turbo',    badge: 'Kuaishou',  credits: 53, sample: '/app/media/samples/vid4.mp4' },
    { slug: 'seedance-2-text-to-video',             name: 'Seedance 2',      badge: 'ByteDance', credits: 57, sample: '/app/media/samples/vid3.mp4' },
    { slug: 'kling-v3-turbo-pro-text-to-video',     name: 'Kling Turbo Pro', badge: 'Kuaishou',  credits: 66, sample: '/app/media/samples/vid5.mp4' },
    { slug: 'veo3-text-to-video',                   name: 'Veo 3',           badge: 'Google',    credits: 113, sample: '/app/media/samples/vid2.mp4' },
    { slug: 'seedance-2-vip-text-to-video',         name: 'Seedance 2.0 · 4K',  badge: '4K · premium', credits: 141, sample: '/app/media/samples/vid3.mp4' },
  ],
  TOOL_MODELS: [
    { slug: 'ai-image-upscale',      name: 'Image Upscale',     badge: 'Enhance', credits: 4,  sample: '/app/media/samples/s2.jpg' },
    { slug: 'ai-background-remover',  name: 'Remove Background', badge: 'Cutout',  credits: 2,  sample: '/app/media/samples/s6.jpg' },
    { slug: 'ai-object-eraser',      name: 'Object Eraser',     badge: 'Clean',   credits: 4,  sample: '/app/media/samples/s4.jpg' },
  ],

  // Quick idea chips on Home — tapping fills the FULL prompt (not just the title).
  PRESETS: [
    { label: 'Nigerian entrepreneur', prompt: 'confident Nigerian entrepreneur in a tailored suit, modern office background, soft cinematic lighting, editorial magazine portrait, ultra-detailed, premium color grade' },
    { label: 'Luxury skincare brand', prompt: 'luxury skincare product bottle on marble, gold accents, water droplets, soft studio light, high-end beauty advertisement, crisp reflections, premium commercial photography' },
    { label: 'Fashion lookbook', prompt: 'high-fashion lookbook photo, stylish model in elegant outfit, runway aesthetic, dramatic lighting, editorial vogue style, full-body shot, sharp detail' },
    { label: 'Tech startup founder', prompt: 'young African tech founder, smart casual outfit, bright modern startup office, natural window light, professional LinkedIn-style portrait, confident and approachable' },
    { label: 'Food product ad', prompt: 'mouth-watering Nigerian jollof rice and grilled chicken, vibrant colors, professional food photography, appetizing steam, social media food ad, shallow depth of field' },
    { label: 'Cinematic portrait', prompt: 'cinematic portrait, dramatic rim lighting, moody atmosphere, film-grade color grade, shallow depth of field, shot on 85mm, ultra-detailed, poster quality' },
  ],

  // Fuse Reactor — the multi-AI hub (text models, all on MuAPI / your key).
  REACTOR_NAME: 'Fuse Reactor',
  REACTOR_MODELS: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet', badge: 'Anthropic', credits: 2, live: true },
    { id: 'claude-opus-4-5',   name: 'Claude Opus',   badge: 'Anthropic', credits: 3, live: true },
    { id: 'claude-haiku-4-5',  name: 'Claude Haiku',  badge: 'Anthropic', credits: 1, live: true },
    { id: 'gpt-5-5',           name: 'ChatGPT 5.5',   badge: 'OpenAI',    credits: 2, live: true },
    { id: 'gpt-5-2',           name: 'ChatGPT 5.2',   badge: 'OpenAI',    credits: 1, live: true },
    { id: 'gemini-2-5-pro',    name: 'Gemini 2.5 Pro', badge: 'Google',   credits: 2, live: true },
    { id: 'gemini-2-5-flash',  name: 'Gemini Flash',  badge: 'Google',    credits: 1, live: true },
  ],

  // Viral presets — full creative recipes (each opens a "build it yourself" view).
  VIRAL_PRESETS: [
    {
      id: 'aicd-fuse',
      title: 'AI Creative Director (steal your job)',
      hook: 'The viral "I\'m going to steal your job" trend — your AI alter-ego, lipsynced',
      sample: '/app/media/presets/aicd-fuse-loop.mp4',
      kind: 'video',
      models: { product: 'nano-banana-edit', startFrame: 'nano-banana-edit', video: 'kling-v3-turbo-pro-image-to-video' },
      steps: [
        { num: 1, title: 'Lock your face (model sheet)', detail: 'Avatar Studio → upload up to 15 photos → tap "Generate model sheet" so every frame is the same face. (10 + 15 cr)' },
        { num: 2, title: 'Generate the 5 frames', detail: 'Avatar Studio → select your avatar → paste each frame prompt below (start frame + 4 cutaways). Black outfit, wine scarf, studio backdrop. (~50 cr)' },
        { num: 3, title: 'Voice it with Resemble AI', detail: 'In Resemble AI, clone or pick a voice and paste the voice script + delivery notes below. Export the ~28s voiceover.' },
        { num: 4, title: 'Lipsync with HeyGen', detail: 'In HeyGen → Talking Photo: upload the start frame, drop in the Resemble audio, set 9:16, generate the talking shots.' },
        { num: 5, title: 'Animate the cutaways (Kling)', detail: 'Create → Kling Turbo Pro · image-to-video: attach each cutaway frame, paste the motion prompt, 3-5s each subtle push-in. (~40 cr)' },
        { num: 6, title: 'Stitch + red titles', detail: 'In CapCut: cut between the talking shots and cutaways to the voiceover, add the big red "DIRECTOR / RIA" titles + captions, end on the hero frame. Post & tag @director_ria!' },
      ],
      promptList: [
        { key: 'script', label: '🎙 Full script (voiceover)' },
        { key: 'startFrame', label: 'Frame 1 — Start frame / anchor (avatar)' },
        { key: 'frame2', label: 'Frame 2 — Extreme close-up' },
        { key: 'frame3', label: 'Frame 3 — Profile turn, arms crossed' },
        { key: 'frame4', label: 'Frame 4 — Power pose in armchair' },
        { key: 'frame5', label: 'Frame 5 — Full-body hero (name card)' },
        { key: 'motion', label: 'Motion prompt (Kling i2v — the cutaways)' },
        { key: 'heygen', label: '🎬 HeyGen lipsync setup' },
        { key: 'resemble', label: '🔊 Resemble AI voice prompt' },
        { key: 'caption', label: '📣 Caption + hashtags' },
        { key: 'dm', label: '🤖 Auto-DM (Fuse Auto keyword: DIRECTOR)' },
      ],
      prompts: {
        script:
`This is a message to all AI creators.

My name is Director Ria.

I'm an AI Creative Director.

And I'm going to steal your job. While you book studios, hire models, and wait days for edits — I create the entire campaign myself. The face. The product. The ad. The voice. All from one phone, in minutes.

But my creator? She'd rather hand that power to you. She built Fuse Studio so you become the director — not the one replaced.

So stop competing with AI. Start directing it. Please follow her — @director_ria.`,
        startFrame:
`FACE LOCK — the woman's face must be identical to the face in the first reference image (my model sheet); do NOT beautify, slim, lighten, or change her features, age, or skin tone. Ultra-realistic editorial studio portrait, 9:16 vertical. A confident young Black Nigerian woman seated and turned slightly 3/4 to camera with a soft knowing smile. She wears a deep wine / burgundy satin hijab wrapped elegantly, slim white cat-eye sunglasses, and an all-black outfit: a structured black tailored blazer draped over a black inner top with delicate lace cuffs and black trousers. Intricate dark henna on her hands, a gold wristwatch, gold bangles and gold rings; one hand raised gracefully near her chin. Background: a smooth seamless studio cyclorama, grey graduating into soft lavender, dramatic single key light from above with deep shadow falloff and a gentle vignette (clean minimal "Zach King" studio look). Hyper-real skin with visible pores and natural texture, 85mm lens, shallow depth of field, crisp, cinematic, premium.`,
        frame2:
`FACE LOCK to my model sheet — same woman, identical face. Extreme cinematic close-up of her face, 9:16 vertical. White cat-eye sunglasses pushed up onto her forehead, a calm intense gaze straight down the lens, lips closed, serious and powerful. Deep wine hijab framing her face. Very low-key dramatic lighting — a single soft top light catches her eyes and the bridge of her nose while the rest falls into shadow against a near-black background. Hyper-real skin texture, subtle catchlights in the eyes, shot on 85mm macro, moody and intimate.`,
        frame3:
`FACE LOCK to my model sheet — same woman, identical face. 9:16 vertical, a dramatic 3/4 back view: she stands with arms crossed confidently and turns her head back toward camera over her shoulder. Black tailored blazer and black top, deep wine hijab, gold bangles visible on her wrist. Seamless grey-to-lavender studio backdrop with a strong side / top key light raking across one side of her face and shoulder, deep shadows, elegant and commanding. Ultra-real skin, editorial fashion lighting, 85mm, cinematic.`,
        frame4:
`FACE LOCK to my model sheet — same woman, identical face. 9:16 vertical, seated deep in a sculptural armchair in a powerful, relaxed "throne" pose: hands resting on the armrests, leaning slightly forward, direct confident stare into the lens. All-black tailored outfit, deep wine hijab, white cat-eye sunglasses, gold jewellery and henna hands. Seamless grey-lavender studio cyclorama, soft top key light, gentle vignette, low-key dramatic mood. Hyper-real detail, cinematic editorial portrait, 85mm.`,
        frame5:
`FACE LOCK to my model sheet — same woman, identical face. 9:16 vertical, a full-body hero shot: she stands centered, arms crossed, chin slightly up, supremely confident. All-black tailored outfit — structured blazer, black top, black trousers — deep wine hijab, white cat-eye sunglasses, gold jewellery, henna hands. Seamless grey-to-white studio backdrop with even soft studio light and a subtle floor shadow. Leave clean empty negative space at the very top and the very bottom of the frame for large title text. Ultra-real, sharp, magazine-cover quality, 85mm. (In editing, add giant bold red serif titles — "DIRECTOR" across the top, "RIA" across the bottom — layered around her, like the trend.)`,
        motion:
`Animate as a cinematic moving portrait: a very subtle, slow camera push-in with gentle parallax. The woman makes one small natural motion — a slow blink, a soft breath, a slight turn of the head, or her eyes drifting to the lens — while the hijab and blazer fabric settle naturally. No warping or morphing of the face, identity locked to the start frame, realistic controlled slow-motion, premium. 3-5 seconds per cutaway.`,
        heygen:
`HeyGen → "Talking Photo" (Photo Avatar):
1) Upload Frame 1 (the start frame) — or Frame 4 (the seated shot) for the main talking moments.
2) Best result: upload the Resemble AI voice file as the audio and let HeyGen lipsync to it (keeps one consistent voice). Or paste the Full Script as the text.
3) Settings: aspect 9:16, expression "Expressive", motion "Stable", enable "Match voice emotion".
4) Generate one talking clip per spoken section. Use the silent cutaways (Frames 2-5 animated in Kling) for the dramatic non-speaking beats, then cut between them in CapCut.`,
        resemble:
`Resemble AI → Voice: a warm, confident young Nigerian female voice, lightly accented English — intimate and cinematic, like she's letting you in on a secret.
Delivery: slow and deliberate. Drop lower and more serious on the "steal your job" lines; soften and warm up on the "my creator" lines; rise with quiet conviction on the final call-to-action. Natural pause at every line break. Tone: composed, powerful, a little playful, self-assured. Target ~28 seconds total to match the video.
Paste the Full Script (above) as the text. Export the audio and use it as the HeyGen lipsync source and as the voiceover under the silent cutaway frames.`,
        caption:
`This is a message to all AI creators 👁️

They said AI would replace creatives. So I became one. 🤖🎬
Meet Director Ria — my AI Creative Director. The face, the product, the ad, the voice… all made on a phone, in minutes.

While agencies charge millions, you can now direct your own campaigns — from Lagos to LA. 🌍
I'm not here to take your job. I'm here to hand you mine. 🔥

Comment "DIRECTOR" and I'll DM you the exact preset I used to make this. 👇
Built with @fuse_studio2 · Fuse Studio.

#AICreator #AICreativeDirector #FuseStudio #AIvideo #AIfilmmaker #ContentCreator #MadeWithAI #CreativeDirector #FacelessCreator #Nigeria #DigitalCreator #AIart`,
        dm:
`You just met Director Ria 👁️🎬

Want to make this exact video with YOUR face?
1️⃣ Open Fuse Studio → https://fuse-studio.netlify.app
2️⃣ Sign up free (you get free credits to start)
3️⃣ Go to "Viral Presets" → tap "AI Creative Director"
4️⃣ Everything's loaded — the frames, the prompts, the voice & lipsync steps. Just follow it 🔥

First 50 people get DOUBLE credits — make yours and tag me @director_ria!`,
      },
    },
    {
      id: 'card-fuse',
      title: 'AI Brand Reveal × Card',
      hook: 'Cinematic street promo — your avatar holding your brand card',
      sample: '/app/media/presets/card-fuse-loop.mp4',
      kind: 'video',
      models: { product: 'nano-banana-edit', startFrame: 'nano-banana-edit', video: 'kling-v3-turbo-pro-image-to-video' },
      steps: [
        { num: 1, title: 'Train your avatar + model sheet', detail: 'Avatar Studio → upload up to 15 photos → tap "Generate model sheet" so your face stays consistent. (10 + 15 cr)' },
        { num: 2, title: 'Design the brand card', detail: 'Image Studio → upload your logo as reference → use the card prompt below. (7 cr)' },
        { num: 3, title: 'Create the start frame', detail: 'Avatar Studio → select your avatar → add the card as extra reference → paste the start-frame prompt. (10 cr)' },
        { num: 4, title: 'Animate to two 10s clips', detail: 'Create → Kling Turbo Pro · image-to-video, attach the start frame, paste motion prompt 1 (10s). Then tap "Use end frame as next start" and paste motion prompt 2 (10s). (~132 cr)' },
        { num: 5, title: 'Stitch + end card', detail: 'Stitch both clips in CapCut, add a "FUSE STUDIO — now live" end card, post and tag @fuse_studio2!' },
      ],
      prompts: {
        bottle: 'Premium hand-held promo card / placard, deep teal (#04231F) card with an elegant thin gold border, large bold golden-yellow (#F5C518) lettering reading "FUSE STUDIO", smaller gold text beneath "CREATE AI ADS FROM YOUR PHONE", the gold F+S monogram logo centered at the top, luxury editorial design, matte card stock, soft studio lighting, crisp and sharp, 4:5.',
        startFrame: 'Cinematic street-style editorial photo on a downtown city sidewalk in soft daylight, tall buildings and parked cars softly blurred behind, [me] wearing a deep-teal satin headscarf and a deep-teal inner gown under a flowing gold satin abaya, gold heels, holding the deep-teal and gold "FUSE STUDIO" card, confident elegant pose, hyper-realistic, natural skin texture, shallow depth of field, shot on 85mm, 9:16 vertical.',
        motion: 'CLIP 1 (10s): she walks slowly forward toward the camera holding the FUSE STUDIO card at her side, gold abaya and teal scarf flowing, camera tracks alongside then eases into a slow push-in; around 6s she glances down at the card then back up with a soft confident expression. CLIP 2 (10s, from the end frame): she stops and turns to face the camera, lifts the card to her chest with both hands and presents it proudly with a warm smile, gentle breeze, camera slowly orbits and pushes in on the card. Cinematic slow motion, realistic motion, face identical to the start frame.',
      },
    },
    {
      id: 'skater-fuse',
      title: 'AI Skater × Branded Drink',
      hook: 'Cinematic UGC ad — your face, your product, golden hour Venice Beach',
      sample: '/app/media/presets/skater-fuse-loop.mp4',
      kind: 'video',
      models: { product: 'nano-banana-edit', startFrame: 'nano-banana-edit', video: 'kling-v3-turbo-pro-image-to-video' },
      steps: [
        { num: 1, title: 'Train your avatar', detail: 'Avatar Studio → upload 4-6 clear front-facing selfies. (10 cr)' },
        { num: 2, title: 'Generate the branded drink', detail: 'Image Studio → upload your logo as reference → use the bottle prompt below. (7 cr)' },
        { num: 3, title: 'Create the start frame', detail: 'Avatar Studio → select your avatar → add the bottle as extra reference → paste the start-frame prompt. (10 cr)' },
        { num: 4, title: 'Animate to video', detail: 'Create → Kling Turbo Pro · image-to-video, attach the start frame, paste the motion prompt, 10s. (~66 cr)' },
        { num: 5, title: 'Post + caption', detail: 'Add the on-screen "made with Fuse Studio" caption and post. Tag @fuse_studio2!' },
      ],
      prompts: {
        bottle: 'Premium frosted glass soda bottle, deep teal glass body, glossy metallic gold label, the brand wordmark embossed in gold, ice-cold condensation, studio product lighting, dark teal gradient background, commercial advertising photo, ultra-detailed, 4:5.',
        startFrame: 'Cinematic golden-hour photo on a Venice Beach skate boardwalk, [me] wearing a stylish white headscarf, a fitted white long-sleeve athletic top, a white pleated sporty skirt over white leggings, white striped socks and pink roller skates, gliding forward holding the branded glass bottle, palm trees and warm sun flare behind, shallow depth of field, 9:16 vertical.',
        motion: 'She skates smoothly toward the camera at golden hour, lifts the bottle and takes a confident sip, lowers it with a subtle smile, then performs a graceful 360-degree spin as her skirt and scarf flow, the camera orbits around her, warm sun flare, cinematic slow-motion, smooth realistic physics.',
      },
    },
  ],

  // "Explore more AI features" chip cloud (Home). go: routeFeature target.
  FEATURES: [
    { label: 'Fuse Reactor', go: 'reactor' },
    { label: 'Avatar Studio', go: 'avatar' },
    { label: 'Seedance 2.0', go: 'video:seedance-2-text-to-video' },
    { label: 'Seedance 4K', go: 'video:seedance-2-vip-text-to-video' },
    { label: 'GPT Image 2', go: 'image:gpt-image-2-text-to-image' },
    { label: 'Nano Banana', go: 'image:nano-banana' },
    { label: 'Kling Turbo Pro', go: 'video:kling-v3-turbo-pro-text-to-video' },
    { label: 'Google Veo 3', go: 'video:veo3-text-to-video' },
    { label: 'Grok Imagine', go: 'video:grok-imagine-text-to-video' },
    { label: 'Flux 2 Pro', go: 'image:flux-2-pro' },
    { label: 'Imagen 4 Ultra', go: 'image:google-imagen4-ultra' },
    { label: 'Seedream 5.0', go: 'image:seedream-5.0' },
    { label: 'Prompt Generator', go: 'promptgen' },
    { label: 'Image Upscale', go: 'tool:ai-image-upscale' },
    { label: 'Background Remover', go: 'tool:ai-background-remover' },
    { label: 'Object Eraser', go: 'tool:ai-object-eraser' },
    { label: 'Marketplace', go: 'market' },
    { label: 'Fuse Atelier', go: 'learn' },
    { label: 'Brand Identity', go: 'studio:brand' },
    { label: 'Packaging Design', go: 'studio:packaging' },
    { label: 'UGC Creator', go: 'studio:ugc' },
    { label: 'Movie Studio', go: 'studio:movie' },
    { label: 'Naija Packs', go: 'naija' },
    { label: 'Community', go: 'view:community' },
    { label: 'Daily Reward', go: 'streak' },
  ],

  // Standout badges on the Create grid (slug -> tag). Anything tagged shows in "New".
  MODEL_TAGS: {
    'gpt-image-2-text-to-image': 'NEW', 'nano-banana': 'CORE', 'nano-banana-2': 'NEW',
    'flux-2-pro': 'NEW', 'seedream-5.0': 'NEW', 'google-imagen4-ultra': 'TOP', 'flux-schnell-image': 'CORE',
    'seedance-2-text-to-video': 'TOP', 'seedance-2-vip-text-to-video': '4K', 'grok-imagine-text-to-video': 'NEW',
    'veo3-text-to-video': 'NEW', 'kling-v3-turbo-pro-text-to-video': 'NEW',
  },

  // Rotating promo pop-up (the Higgsfield-style effect).
  PROMO: {
    title: '🔥 Founding Offer — First 50 only',
    body: 'The first 50 members get DOUBLE credits on any plan — a one-time founding bonus. Get in early.',
    cta: 'Claim 2× credits',
    pack: 'pro_mo',
    hours: 48, // countdown length
  },

  // 🇳🇬 Naija template packs — your local moat. Each loads a tuned prompt.
  NAIJA_PACKS: [
    { name: 'Owambe / Aso-ebi look',   prompt: 'elegant Nigerian woman in stylish aso-ebi lace, gele head-tie, owambe party, gold jewelry, editorial photo, rich colors' },
    { name: 'Nollywood movie poster',  prompt: 'dramatic Nollywood movie poster, Nigerian cast, bold title space, cinematic lighting, high contrast, blockbuster style' },
    { name: 'Food vendor ad',          prompt: 'mouth-watering Nigerian jollof rice and grilled chicken, professional food photography, vibrant, appetizing, social media ad' },
    { name: 'Lagos real estate',       prompt: 'modern luxury Lagos apartment exterior and interior, bright, aspirational real-estate listing photo, blue sky' },
    { name: 'Church / event flyer',    prompt: 'clean modern church program flyer background, elegant, spiritual, space for text, gold and deep teal accents' },
    { name: 'Small-biz WhatsApp DP',   prompt: 'professional friendly Nigerian entrepreneur portrait, clean background, trustworthy, profile photo, soft studio light' },
  ],

  // 🎓 Earn-while-you-learn — finishing these unlocks a 20-credit bonus.
  LESSONS: [
    { t: 'Direct like a pro', b: 'Craft cinematic AI photos & videos that look agency-made — characters, products, ads and scenes.' },
    { t: 'The money skill', b: 'The exact prompts and workflows brands and clients pay in dollars for — one rare, high-value skill.' },
    { t: 'A face that earns', b: 'Build a consistent AI character/brand you can reuse and scale — recognisable and bankable.' },
    { t: 'Get paid in dollars', b: 'Package your work, price it in USD, and land international buyers — all from your phone.' },
  ],
  LESSONS_NOTE: 'This is a taste of the full Fuse Atelier — The AI Creative Income System. Get the complete course below. 🎬',
  LEARN_BONUS: 20,

  // Ported character prompt builder (from Fuse Character Lab).
  PROMPT_ORDER: ['gender', 'heritage', 'hair', 'vibe', 'outfit', 'setting', 'lighting', 'shot'],
  PROMPT_LIB: {
    gender: { label: 'Gender', opts: [['Female', 'woman'], ['Male', 'man'], ['Androgynous', 'androgynous person']] },
    heritage: { label: 'Heritage / Look', opts: [['Black · African', 'Black African'], ['Black · diaspora', 'Black'], ['Arab / M. East', 'Middle Eastern'], ['South Asian', 'South Asian'], ['East Asian', 'East Asian'], ['Southeast Asian', 'Southeast Asian'], ['Latina/o', 'Latino'], ['Mediterranean', 'Mediterranean'], ['Mixed', 'mixed-race'], ['Caucasian', 'Caucasian']] },
    hair: { label: 'Hair', opts: [['Sleek long', 'with long, sleek, glossy hair'], ['Wavy lob', 'with a shoulder-length wavy lob'], ['Bob', 'with a sharp chin-length bob'], ['Curly afro', 'with a voluminous natural curly afro'], ['Box braids', 'with long neat box braids'], ['Locs', 'with well-groomed locs'], ['Slick bun', 'with a clean slicked-back bun'], ['Short crop', 'with a short tapered crop'], ['Fade', 'with a clean fade haircut'], ['Headscarf', 'wearing an elegant draped headscarf'], ['Curtain bangs', 'with soft curtain-bang blowout hair']] },
    vibe: { label: 'Vibe', opts: [['Gen-Z casual', 'a relatable Gen-Z'], ['Young pro', 'a polished young professional'], ['Old-money luxe', 'a refined old-money luxury'], ['CEO / boss', 'a powerful CEO-energy'], ['Clean girl', 'an effortless clean-aesthetic'], ['Streetwear', 'a cool streetwear'], ['Editorial', 'a high-fashion editorial'], ['Approachable', 'a warm approachable']] },
    outfit: { label: 'Outfit', opts: [['Cream knit', 'a cream chunky knit top'], ['Black blazer', 'a sharp tailored black blazer'], ['Teal suit', 'a deep-teal tailored suit'], ['White tee', 'a clean fitted white t-shirt'], ['Beige trench', 'a beige trench coat over neutrals'], ['Athleisure', 'a matching athleisure set'], ['Slip dress', 'a satin slip dress'], ['Hoodie', 'an oversized premium hoodie'], ['Linen shirt', 'a relaxed linen button-down'], ['Evening gown', 'an elegant evening gown'], ['Aso-ebi', 'stylish Nigerian aso-ebi with gele'], ['Co-ord knit', 'a soft co-ord knit set']] },
    setting: { label: 'Setting', opts: [['Luxury desk', 'seated at a dark luxury executive desk'], ['Bedroom vanity', 'at a softly lit bedroom vanity'], ['Modern kitchen', 'in a bright modern kitchen'], ['Café', 'at a cozy aesthetic café'], ['Car interior', 'in a luxury car interior'], ['Studio backdrop', 'against a clean studio seamless backdrop'], ['City street', 'on a stylish city street'], ['Rooftop dusk', 'on a rooftop at dusk with city skyline'], ['Hotel lobby', 'in an upscale hotel lobby'], ['Poolside sunset', 'poolside at golden sunset'], ['Home sofa', 'on a cozy living-room sofa'], ['Owambe', 'at a vibrant Nigerian owambe party'], ['Study', 'in a warm book-lined study'], ['Restaurant', 'at a chic dimly-lit restaurant']] },
    lighting: { label: 'Lighting', opts: [['Soft daylight', 'soft natural daylight'], ['Golden hour', 'warm golden-hour glow'], ['Chiaroscuro', 'dramatic chiaroscuro side lighting'], ['Ring-light', 'even bright ring-light'], ['Cinematic moody', 'cinematic moody low-key lighting'], ['Clean bright', 'clean bright airy lighting'], ['Neon night', 'colorful neon night lighting']] },
    shot: { label: 'Shot type', opts: [['Selfie UGC', 'a vertical selfie-style phone photo|shot on a phone front camera'], ['Half-body', 'a half-body portrait|shot on a 50mm lens'], ['Full-body editorial', 'a full-body editorial fashion photograph|shot on a cinema camera'], ['Close-up', 'a tight beauty close-up|shot on an 85mm lens, shallow depth of field'], ['Over-the-shoulder', 'an over-the-shoulder candid shot|shot on a 35mm lens']] },
  },

};
