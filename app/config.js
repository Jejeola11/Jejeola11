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
    { key: 'atelier_starter', name: 'Fuse Atelier — Starter', naira: 10000, credits: 100,  note: 'Design skills + Money Engine', kind: 'course' },
    { key: 'atelier_creator', name: 'Fuse Atelier — Creator', naira: 25000, credits: 400,  note: '16 skills + community + Character Lab', kind: 'course', featured: true },
    { key: 'atelier_empire',  name: 'Fuse Atelier — Empire',  naira: 70000, credits: 1200, note: 'Everything + direct access to Ria', kind: 'course' },
    { key: 'bundle_120', name: '120 credits',   naira: 3000,  credits: 120,  note: 'Top-up · never expires', kind: 'pack' },
    { key: 'bundle_320', name: '320 credits',   naira: 7000,  credits: 320,  note: 'Top-up · best value',    kind: 'pack' },
    { key: 'bundle_750', name: '750 credits',   naira: 15000, credits: 750,  note: 'Top-up · bulk',          kind: 'pack' },
  ],

  // Launch promo — mirrors netlify/functions/_packs.js exactly (dates + multipliers
  // must match, or the buy modal and the actual grant will disagree). Auto-expires
  // at endsAt; nothing to remember to turn off. Named LAUNCH_PROMO (not PROMO) —
  // PROMO below is the older home-banner config, a different, unrelated shape.
  LAUNCH_PROMO: {
    label: 'Fuse Studio Full Launch',
    startsAt: '2026-07-08T00:00:00+01:00',
    endsAt: '2026-07-10T00:00:00+01:00',
    subMultiplier: { creator_mo: 2, pro_mo: 3, agency_mo: 4 },
    courseCredits: 2500,
  },

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

  // Fuse Reactor — the multi-AI hub. Text models chat (and can read images you
  // attach); image models generate/edit pictures right inside the Reactor.
  // kind:'text' (default) -> ai-chat. kind:'image' -> generate (slug = image model).
  REACTOR_NAME: 'Fuse Reactor',
  REACTOR_MODELS: [
    { id: 'claude-sonnet-4-5', name: 'Claude Sonnet', badge: 'Anthropic', credits: 2, live: true, kind: 'text', vision: true },
    { id: 'claude-opus-4-5',   name: 'Claude Opus',   badge: 'Anthropic', credits: 3, live: true, kind: 'text', vision: true },
    { id: 'claude-haiku-4-5',  name: 'Claude Haiku',  badge: 'Anthropic', credits: 1, live: true, kind: 'text', vision: true },
    { id: 'gpt-5-5',           name: 'ChatGPT 5.5',   badge: 'OpenAI',    credits: 2, live: true, kind: 'text', vision: true },
    { id: 'gpt-5-2',           name: 'ChatGPT 5.2',   badge: 'OpenAI',    credits: 1, live: true, kind: 'text', vision: true },
    { id: 'gemini-2-5-pro',    name: 'Gemini 2.5 Pro', badge: 'Google',   credits: 2, live: true, kind: 'text', vision: true },
    { id: 'gemini-2-5-flash',  name: 'Gemini Flash',  badge: 'Google',    credits: 1, live: true, kind: 'text', vision: true },
    // --- Image AIs: generate or edit pictures in the Reactor (charged like Image Studio) ---
    { id: 'nano-banana',          name: 'Gemini Image (Nano Banana)', badge: 'Google · image', credits: 7,  live: true, kind: 'image', slug: 'nano-banana' },
    { id: 'gpt-image-2',          name: 'GPT Image 2',                badge: 'OpenAI · image', credits: 7,  live: true, kind: 'image', slug: 'gpt-image-2-text-to-image' },
    { id: 'google-imagen4-ultra', name: 'Imagen 4 Ultra',            badge: 'Google · image', credits: 10, live: true, kind: 'image', slug: 'google-imagen4-ultra' },
  ],

  // Viral presets — full creative recipes (each opens a "build it yourself" view).
  VIRAL_PRESETS: [
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
    { label: 'Omni Studio', go: 'studio:omni' },
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
    { label: 'The $500 Week', go: 'week' },
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

  // Home-page promo banner + popup — both buttons open the credit top-up
  // modal. (The old "2× founding credits" offer has ended — this is the
  // evergreen replacement. Edit freely for future promos.)
  PROMO: {
    title: '✨ Build your consistent AI face',
    body: 'Train your avatar once, then generate yourself in any scene — same face, every time. Top up and start creating.',
    cta: 'Top up credits',
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

  // 🎬 Mini Masterclasses — CANCELLED (2026-07-07). Focus is back on The $500
  // Week (₦5,000) only. Left as an empty array rather than deleting the whole
  // feature's plumbing (unlock-module.js codes, mini hub views, Storage-video
  // fallback) — MINI_COURSES:[] means the hub renders nothing and the "Mini
  // Masterclasses" chip is removed from Home, so it's fully hidden from users
  // while staying trivially reversible if this ever restarts.
  MINI_COURSES: [],
  MINI_PRICE_NAIRA: 1000,

  // Fuse Character Lab links — the prompt-builder companion tool. Reused by the
  // AI Avatar mini-course banner (new buyer → sales page, existing → the tool).
  CHARLAB_BUY_URL: 'https://fusecharacterlabpage.netlify.app/',
  CHARLAB_TOOL_URL: 'https://fuse-character-lab.netlify.app/',

  // Written step-by-step lesson notes shown UNDER each mini-course video. Keyed
  // by course key (matches MINI_COURSES). Written from the real tutorial videos
  // so the text tracks exactly what's demonstrated on screen. `charlab: true`
  // adds the Fuse Character Lab two-button banner (Avatar course uses it).
  MINI_CONTENT: {
    avatar: {
      charlab: true,
      steps: [
        ['Open AI Avatar Studio', 'In Fuse Studio tap <b>Create → Avatar Studio</b> ("generate yourself in any scene"). This is where your reusable AI face lives.'],
        ['Train your avatar', 'Tap <b>Train a new avatar</b> and upload <b>10–20 clear photos of yourself</b> from different angles in good light. The more varied the photos, the more consistent your AI face. Give it a name and tap <b>Train avatar</b>.'],
        ['Generate your Consistency Model Sheet', 'Once training finishes, tap <b>Generate model sheet</b>. This builds a multi-angle sheet that <b>locks your face</b> so every image you make afterwards is unmistakably the same person.'],
        ['Describe the scene (or build it in Fuse Character Lab)', 'Type your scene in the box — e.g. <i>"CEO in a modern Lagos office, navy suit, magazine-cover lighting"</i> — or open <b>Fuse Character Lab</b> to build a detailed prompt from menus (heritage, hair, vibe, outfit, setting, lighting, shot type) and paste it in. You can add up to 3 reference images for props or products.'],
        ['Set 9:16 and Generate', 'Choose <b>9:16 vertical</b> and tap <b>Generate</b>. You get yourself in that exact scene — same face, every time.'],
        ['Reuse it forever', 'Your trained avatar stays saved. Generate unlimited new scenes, outfits and campaigns on demand — no photoshoot, no studio, no waiting.'],
      ],
    },
    productad: {
      steps: [
        ['Get your brand brief from Fuse Reactor', 'Open <b>Create → Fuse Reactor</b> and pick <b>Claude Sonnet</b>. Ask it for a <i>full project brief for 5 product renders</i> — give it a niche (e.g. luxury beauty) and it returns a real brand, exact colour codes, one hero product, five render concepts, and ready-to-paste prompts.'],
        ['Generate your reference product', 'Go to <b>Create → Image</b>, engine <b>Nano Banana</b>, aspect <b>9:16</b>. Paste the "isolated product on pure white background" prompt from your brief. This clean shot becomes your <b>consistent reference product</b>.'],
        ['Render each scene', 'For each of the 5 concepts, add your reference product as an <b>image reference</b>, paste that scene\'s prompt (deep-sea origin, champagne vanity, submerged luxury, minimalist editorial, gold-hour opulence…) and generate. Run 3–4 variations and keep the best.'],
        ['Keep the product accurate', 'When using the reference, keep <b>style strength around 70–85%</b> — high enough that the scene transforms, low enough that your product stays true to the original.'],
        ['Polish for delivery', 'Colour-grade each render to your brand hex codes, sharpen the label, add a subtle vignette on the darker renders, then export web-optimized JPGs (1500×1500).'],
        ['That\'s a full ad set', 'One product, five studio-grade ads — no studio, no photographer, no shoot day. This is exactly the work brands pay <b>$200–$2,000</b> for.'],
      ],
    },
  },

  // 🎓 Earn-while-you-learn — finishing these unlocks a 20-credit bonus.
  LESSONS: [
    { t: 'Direct like a pro', b: 'Craft cinematic AI photos & videos that look agency-made — characters, products, ads and scenes.' },
    { t: 'The money skill', b: 'The exact prompts and workflows brands and clients pay in dollars for — one rare, high-value skill.' },
    { t: 'A face that earns', b: 'Build a consistent AI character/brand you can reuse and scale — recognisable and bankable.' },
    { t: 'Get paid in dollars', b: 'Package your work, price it in USD, and land international buyers — all from your phone.' },
  ],
  LESSONS_NOTE: 'This is a taste of the full Fuse Atelier — The AI Creative Income System. Get the complete course below. 🎬',
  LEARN_BONUS: 20,

  // Ported character prompt builder (from Fuse Character Lab). Category
  // order/grouping (character-only vs. shared-with-General-mode) lives in
  // app.js's PG_ORDER_CHAR/PG_ORDER_SHARED, not here.
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
  // Target platforms the assembler writes a tuned prompt for — each has its
  // own phrasing + its own identity-consistency block (e.g. Midjourney locks
  // identity via --cref/--seed, GPT Image via re-uploading the same reference
  // photo, Soul via its trained Soul ID).
  PROMPT_PLATFORMS: [
    { id: 'fuse', label: 'Fuse Studio' },
    { id: 'soul', label: 'Higgsfield Soul' },
    { id: 'gpt', label: 'ChatGPT / GPT Image' },
    { id: 'mj', label: 'Midjourney' },
    { id: 'kling', label: 'Kling (video)' },
  ],
  // Ready-made character presets — tap one to instantly load every chip.
  PROMPT_PRESETS: [
    { nm: 'The Signature', ds: 'Luxury Black woman, headscarf, teal suit, executive desk.', st: { gender: 0, heritage: 0, hair: 9, vibe: 2, outfit: 2, setting: 0, lighting: 2, shot: 2 } },
    { nm: 'Clean-Girl Maya', ds: 'Effortless Black woman, sleek hair, café, soft daylight.', st: { gender: 0, heritage: 1, hair: 0, vibe: 4, outfit: 0, setting: 3, lighting: 0, shot: 0 } },
    { nm: 'The Founder (M)', ds: 'CEO-energy man, black blazer, luxury desk, moody light.', st: { gender: 1, heritage: 0, hair: 8, vibe: 3, outfit: 1, setting: 0, lighting: 2, shot: 2 } },
    { nm: 'Streetwear Kai', ds: 'Cool man, fade, hoodie, neon city street.', st: { gender: 1, heritage: 1, hair: 8, vibe: 5, outfit: 7, setting: 6, lighting: 6, shot: 0 } },
    { nm: 'Soft Luxe Bob', ds: 'Clean-aesthetic woman, bob, hotel lobby, golden hour.', st: { gender: 0, heritage: 9, hair: 2, vibe: 4, outfit: 4, setting: 8, lighting: 1, shot: 1 } },
    { nm: 'Fitness Coach', ds: 'Athleisure woman, slick bun, modern gym, bright light.', st: { gender: 0, heritage: 0, hair: 6, vibe: 0, outfit: 5, setting: 11, lighting: 5, shot: 0 } },
    { nm: 'Editorial Curls', ds: 'High-fashion woman, curly afro, studio seamless.', st: { gender: 0, heritage: 0, hair: 3, vibe: 6, outfit: 9, setting: 5, lighting: 2, shot: 2 } },
    { nm: 'Café Linen Guy', ds: 'Approachable man, linen shirt, café, daylight.', st: { gender: 1, heritage: 7, hair: 7, vibe: 7, outfit: 8, setting: 3, lighting: 0, shot: 0 } },
    { nm: 'Aso-Ebi Owambe', ds: 'Old-money-luxe woman, box braids, aso-ebi, owambe party.', st: { gender: 0, heritage: 0, hair: 4, vibe: 2, outfit: 10, setting: 11, lighting: 1, shot: 1 } },
  ],
  // Caption + hashtag maker (template-based, zero cost — no LLM call).
  CAP_PLATFORMS: [
    { k: 'ig', label: '📸 Instagram' }, { k: 'tiktok', label: '🎵 TikTok' },
    { k: 'yt', label: '▶️ YouTube' }, { k: 'linkedin', label: '💼 LinkedIn' },
  ],
  CAP_VIBES: [
    { k: 'bold', label: '🔥 Bold' }, { k: 'story', label: '📖 Story' },
    { k: 'edu', label: '🎓 Teach' }, { k: 'luxe', label: '✨ Luxe' }, { k: 'funny', label: '😄 Fun' },
  ],
  CAP_HOOKS: {
    bold: ["Everyone's doing it wrong.", 'This changes everything.', 'Stop scrolling. You need to see this.', "I can't believe this is AI.", 'Nobody is talking about this.'],
    story: ['A year ago I had nothing to show.', 'I almost gave up on this.', "Here's how it really happened.", 'This started as a random idea…', 'Let me tell you a secret.'],
    edu: ["Save this before it's gone.", "Here's exactly how to do it.", 'The 3 things nobody tells you.', 'Steal my entire process.', 'Watch this if you want to learn fast.'],
    luxe: ['Quiet luxury, loud results.', 'Made to look expensive.', 'This is what premium feels like.', 'Effortless. Elevated. Yours.', 'When the details do the talking.'],
    funny: ['POV: you just discovered the cheat code.', "Tell me you're obsessed without telling me.", 'This took me 5 minutes and a snack.', 'Me pretending I had a whole film crew.', "It's giving main character energy."],
  },
  CAP_CTA: {
    ig: ['Comment "FUSE" and I\'ll send you how 👇', 'Save this for later 🔖', 'Follow for daily AI magic ✨', 'Tag someone who needs this 👀', 'Drop a 🔥 if you want the tutorial'],
    tiktok: ['Follow for part 2 🎬', 'Comment what I should make next 👇', "Save before it's gone ⏳", 'Duet this with your version 🤝', 'Like if this blew your mind 🤯'],
    yt: ['Subscribe for the full breakdown ▶️', 'Full tutorial linked below 👇', 'Comment your questions, I reply to all 💬', "Hit the bell so you don't miss part 2 🔔", 'Like to support free tutorials 🙏'],
    linkedin: ["What would you add? Let's discuss 👇", 'Repost if your network should see this ♻️', 'DM me if you want the full process.', 'Curious how others approach this — thoughts?', 'Follow for more on AI + creativity.'],
  },
  CAP_TAGS: {
    ig: '#aivideo #aiugc #contentcreator #aicontent #reels #aitools #createwithai #digitalcreator #aicreator #fusestudio #ugccreator #explorepage #aigenerated #marketing',
    tiktok: '#aivideo #aitools #fyp #foryou #contentcreator #aiugc #createwithai #techtok #aicreator #learnontiktok #viral #fusestudio',
    yt: '#aivideo #aitutorial #youtubeshorts #contentcreation #aitools #createwithai #aiugc #shorts #digitalcreator #fusestudio',
    linkedin: '#ai #artificialintelligence #contentcreation #marketing #creativity #aitools #personalbrand #digitalmarketing #futureofwork',
  },

};
