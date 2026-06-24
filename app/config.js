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
    { slug: 'flux-schnell-image',    name: 'Flux Schnell',   badge: 'Fast',      credits: 3,  sample: '/app/media/samples/s1.jpg' },
    { slug: 'flux-dev-image',        name: 'Flux Dev',       badge: 'Quality',   credits: 7,  sample: '/app/media/samples/s4.jpg' },
    { slug: 'nano-banana',           name: 'Nano Banana',    badge: 'Google',    credits: 10, sample: '/app/media/samples/s3.jpg' },
    { slug: 'nano-banana-2',         name: 'Nano Banana 2',  badge: 'Google',    credits: 10, sample: '/app/media/samples/s2.jpg' },
    { slug: 'qwen-image',            name: 'Qwen Image',     badge: 'Alibaba',   credits: 5,  sample: '/app/media/samples/s5.jpg' },
    { slug: 'flux-2-pro',            name: 'Flux 2 Pro',     badge: 'Best',      credits: 13, sample: '/app/media/samples/s6.jpg' },
    { slug: 'seedream-5.0',          name: 'Seedream 5.0',   badge: 'ByteDance', credits: 8,  sample: '/app/media/samples/s3.jpg' },
    { slug: 'hunyuan-image-3.0',     name: 'Hunyuan 3.0',    badge: 'Tencent',   credits: 8,  sample: '/app/media/samples/s2.jpg' },
    { slug: 'hunyuan-image-2.1',     name: 'Hunyuan 2.1',    badge: 'Tencent',   credits: 7,  sample: '/app/media/samples/s5.jpg' },
    { slug: 'google-imagen4-ultra',  name: 'Imagen 4 Ultra', badge: 'Google',    credits: 15, sample: '/app/media/samples/s1.jpg' },
    { slug: 'hidream_i1_full_image', name: 'HiDream',        badge: 'HiDream',   credits: 8,  sample: '/app/media/samples/s6.jpg' },
  ],
  VIDEO_MODELS: [
    { slug: 'grok-imagine-text-to-video',           name: 'Grok Imagine',    badge: 'Cheapest',  credits: 19, sample: '/app/media/samples/vid2.mp4' },
    { slug: 'seedance-2-mini-text-to-video',        name: 'Seedance 2 Mini', badge: 'Fast',      credits: 50, sample: '/app/media/samples/vid1.mp4' },
    { slug: 'kling-v3-turbo-standard-text-to-video', name: 'Kling Turbo',    badge: 'Kuaishou',  credits: 70, sample: '/app/media/samples/vid4.mp4' },
    { slug: 'seedance-2-text-to-video',             name: 'Seedance 2',      badge: 'ByteDance', credits: 75, sample: '/app/media/samples/vid3.mp4' },
    { slug: 'kling-v3-turbo-pro-text-to-video',     name: 'Kling Turbo Pro', badge: 'Kuaishou',  credits: 88, sample: '/app/media/samples/vid5.mp4' },
    { slug: 'veo3-text-to-video',                   name: 'Veo 3',           badge: 'Google',    credits: 150, sample: '/app/media/samples/vid2.mp4' },
    { slug: 'seedance-2-vip-text-to-video',         name: 'Seedance 2 VIP',  badge: '4K · premium', credits: 188, sample: '/app/media/samples/vid3.mp4' },
  ],
  TOOL_MODELS: [
    { slug: 'ai-image-upscale',      name: 'Image Upscale',     badge: 'Enhance', credits: 5,  sample: '/app/media/samples/s2.jpg' },
    { slug: 'ai-background-remover',  name: 'Remove Background', badge: 'Cutout',  credits: 3,  sample: '/app/media/samples/s6.jpg' },
    { slug: 'ai-object-eraser',      name: 'Object Eraser',     badge: 'Clean',   credits: 5,  sample: '/app/media/samples/s4.jpg' },
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
