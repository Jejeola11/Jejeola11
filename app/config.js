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

  // Buy options. Real prices are enforced server-side in netlify/functions/_packs.js.
  PACKS: [
    { key: 'creator_mo', name: 'Creator',       naira: 9000,  credits: 350,  note: 'All studios · monthly',  kind: 'sub' },
    { key: 'pro_mo',     name: 'Pro',           naira: 20000, credits: 800,  note: 'Video + AI · monthly',   kind: 'sub', featured: true },
    { key: 'agency_mo',  name: 'Agency',        naira: 75000, credits: 3500, note: 'White-label · monthly',  kind: 'sub' },
    { key: 'course',     name: 'Fuse Atelier Course', naira: 60000, credits: 500, note: 'Course + 500 credits', kind: 'course' },
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
    { slug: 'nano-banana',           name: 'Nano Banana',     badge: 'Google',    credits: 2, sample: '' },
    { slug: 'flux-pro',              name: 'Flux Pro',        badge: 'Best',      credits: 4, sample: '' },
    { slug: 'flux-dev',              name: 'Flux Dev',        badge: 'Quality',   credits: 2, sample: '' },
    { slug: 'flux-schnell',          name: 'Flux Schnell',    badge: 'Fast',      credits: 1, sample: '' },
    { slug: 'google-imagen4',        name: 'Imagen 4',        badge: 'Google',    credits: 3, sample: '' },
    { slug: 'google-imagen4-fast',   name: 'Imagen 4 Fast',   badge: 'Google',    credits: 2, sample: '' },
    { slug: 'google-imagen4-ultra',  name: 'Imagen 4 Ultra',  badge: 'Google',    credits: 5, sample: '' },
    { slug: 'bytedance-seedream-v4', name: 'Seedream v4',     badge: 'ByteDance', credits: 3, sample: '' },
    { slug: 'hunyuan-image-2.1',     name: 'Hunyuan 2.1',     badge: 'Tencent',   credits: 3, sample: '' },
    { slug: 'sdxl',                  name: 'SDXL',            badge: 'Stability', credits: 2, sample: '' },
  ],
  VIDEO_MODELS: [
    { slug: 'seedance-lite', name: 'Seedance Lite', badge: 'ByteDance', credits: 20, sample: '' },
    { slug: 'seedance-pro',  name: 'Seedance Pro',  badge: 'ByteDance', credits: 40, sample: '' },
    { slug: 'kling',         name: 'Kling',         badge: 'Kuaishou',  credits: 50, sample: '' },
    { slug: 'hailuo',        name: 'Hailuo',        badge: 'MiniMax',   credits: 40, sample: '' },
    { slug: 'veo',           name: 'Google Veo',    badge: 'Google',    credits: 60, sample: '' },
  ],

  // Quick preset chips on Home.
  PRESETS: ['Nigerian entrepreneur', 'Luxury skincare brand', 'Fashion lookbook', 'Tech startup founder', 'Food product ad', 'Cinematic portrait'],

  // Fuse Reactor — the multi-AI hub (renamed, not a Higgsfield copy).
  REACTOR_NAME: 'Fuse Reactor',
  REACTOR_MODELS: [
    { id: 'anthropic/claude-3.5-sonnet', name: 'Claude',  badge: 'Anthropic', credits: 2, live: true },
    { id: 'google/gemini-flash-1.5',     name: 'Gemini',  badge: 'Google',    credits: 1, live: true },
    { id: 'openai/gpt-4o-mini',          name: 'ChatGPT', badge: 'OpenAI',    credits: 1, live: true },
    { id: 'kling',  name: 'Kling Video',  badge: 'Video', credits: 40, live: false },
    { id: 'heygen', name: 'HeyGen Avatar',badge: 'Video', credits: 50, live: false },
    { id: 'veo',    name: 'Google Veo',   badge: 'Video', credits: 60, live: false },
  ],

  // Rotating promo pop-up (the Higgsfield-style effect).
  PROMO: {
    title: 'Founding Member Offer',
    body: 'Get 27 days of Studio Pro + the Fuse Atelier course bundle. Limited launch pricing.',
    cta: 'Claim the offer',
    pack: 'course',
    hours: 24, // countdown length
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
    { t: 'Find your money niche', b: 'Pick who you serve: vendors, creators, brands. Riches are in the niches.' },
    { t: 'Write prompts that sell', b: 'Describe the subject, the mood, the lighting, and the use. Specific = stunning.' },
    { t: 'Turn images into income', b: 'Package your work: brand kits, UGC bundles, ad creatives — and price by value.' },
    { t: 'Promote & get paid', b: 'Use your referral link, post your work, run the founding offer to your audience.' },
  ],
  LEARN_BONUS: 20,

};
