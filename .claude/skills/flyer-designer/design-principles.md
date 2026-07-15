# Design Principles Reference — read before every flyer job
This is the standard the flyer-designer skill is held to. Every direction proposed and every composite produced must satisfy these rules. Sourced from professional design practice and 2026 AI-generation research.

---

## 1. Hierarchy (the whole game)
The eye must scan in a deliberate order: **hook/headline → hero visual → supporting detail (date/price/outline) → CTA → fine print (contact/handle)**. Every other principle exists to serve this order. Controlled by, in priority: **size → weight → color/contrast → position**.

**Squint test:** blur your eyes at the composite. If you can still tell what matters most in under a second, hierarchy works. If everything fights for attention, it fails — cut something.

## 2. Composition & grid
- Place the focal point (headline start, or the subject's eyes in a portrait) on a **rule-of-thirds intersection**, not dead-center. Dead-center reads as static/amateur; off-center creates tension and feels directed.
- Define an invisible grid (margins + a few alignment columns) and snap every text block, badge, and logo to it. Nothing floats arbitrarily — misalignment is the fastest way to look unprofessional even when everything else is right.
- Leave real margin at the edges (typically 5–8% of canvas width) — text bleeding to the edge feels cramped.

## 3. White space
Negative space is not wasted space — it isolates the important elements and signals confidence/premium quality. A design that fills every pixel reads as cheap or desperate. When in doubt, remove an element rather than shrink everything to fit.

## 4. Color — the 60-30-10 rule
- **60% dominant** — background/base tone.
- **30% secondary** — supporting imagery, panels, secondary text.
- **10% accent** — the CTA button, price tag, or one highlight word. This is what the eye lands on last and remembers.
- Pick a scheme intentionally: complementary (high energy, sales/urgency), analogous (calm, cohesive, wellness/beauty), or triadic (playful, youth/events). Never more than 3 real colors + black/white.
- Industry psychology: blue = trust/corporate/finance · red = urgency/appetite/sale · green = health/eco/money · purple/gold = luxury/premium/creative · black = authority/high-end.

## 5. Typography
- **Maximum 2 typefaces**: one display (headline) + one body/UI. A 3rd only as a small script/accent for a single word, never for body copy.
- Pair by **contrast, not similarity**: a heavy condensed display sans with a clean light body sans; or an elegant serif display with a simple grotesque body. Two similar-weight sans faces side by side look like a mistake, not a choice.
- Headline: bold/heavy weight, tight leading, can break to 2–3 lines max. Body: generous leading (1.3–1.5x), never smaller than what's legible at phone-feed thumbnail size.
- Kerning matters most at large display sizes — tighten slightly on big bold headlines, never let letters float apart.

## 6. Gestalt principles (why layouts "feel" right)
- **Proximity** — group related items close together (date+time+venue as one cluster, not scattered).
- **Similarity** — same color/shape/font = "these belong to the same category" (e.g., all 3 course-outline bullets in matching pill badges).
- **Closure** — the eye completes implied shapes; you can crop/overlap boldly and the brain still reads the whole.
- **Continuity** — lines, edges and alignment create a path the eye follows; use this to lead from headline to CTA.

## 7. Depth (2025–2026 current, not dated)
Favor: subtle glass/translucent panels ("liquid glass"), soft layered shadows, gentle overlap of cards/shapes at a slight rotation, real photographic grounding (shadows that match the light source). Avoid: heavy drop-shadows, bevel/emboss, skeuomorphism — these read as 2012-era design.

## 8. Balance
Symmetrical = formal, corporate, stable (good for finance/education/religious). Asymmetrical = modern, dynamic, energetic (good for events/fashion/tech) — balance is achieved by visual *weight* (one large light shape can balance one small dark shape), not mirrored placement.

---

## THE #1 RULE: never let the AI model render final text
Diffusion/image models still garble body copy, misspell words, and distort logos often enough that it is never safe to ship raw model-rendered text on customer-facing work. This is the single most recognizable "AI tell."

**The professional workflow (always follow this):**
1. Generate the **background/hero visual only** — the photograph, the scene, the product shot, the abstract backdrop. The prompt must explicitly exclude text: *"no text, no typography, no logos, no watermark, no letters."*
2. Composite the headline, body copy, badges, price, CTA, and logo **in code** (HTML/CSS rendered to a flat image) — real fonts, pixel-perfect kerning, zero typo risk, guaranteed contrast via a scrim or text-shadow over the photo.
3. This is not a workaround — it is how real agencies work (Midjourney/Firefly for the visual, then Figma/Photoshop for layout and type). We're doing the same thing with code instead of a design app.

## The other AI tells to actively avoid
- **Waxy/plastic skin, over-smoothed uncanny-valley faces** → prompt real skin texture, imperfections, natural tone variation; negative-prompt "no airbrushing, no plastic skin, no waxy texture."
- **Flat/inconsistent lighting** (subject looks pasted onto the background) → always specify light direction and quality in the prompt, matching subject and background.
- **The cliché AI purple-blue gradient / generic oversaturation** → specify real, intentional colors tied to the brand; negative-prompt "no generic gradient, no oversaturation."
- **Hyper-symmetry that feels sterile** → break perfect symmetry deliberately (rule of thirds, asymmetrical balance).
- **Mangled hands/logos** → keep hands out of frame or minimal; never trust the model with an actual brand mark — composite the real logo file in code instead.

## Prompt engineering for photorealistic hero visuals
Every image prompt should hit these, in ~30–75 words total (too short = generic AI defaults; too long = diluted):
1. **Subject + material/wardrobe** — what/who, what they're wearing or made of.
2. **Camera & lens** — name real gear: *"shot on Canon EOS R5, 85mm f/1.8"* or *"Sony A7 IV, 50mm."* An 85–100mm lens flatters faces and separates subject from background with natural bokeh.
3. **Lighting** — direction + quality, always: *"warm golden-hour light from camera-left, soft falloff on the right"* / *"studio softbox key light, gentle fill."* Unspecified lighting is a top AI tell.
4. **Film stock reference** (optional but effective) — *"Kodak Portra 400"* for warm flattering skin tones, *"Fujifilm Provia"* for accurate color, *"Kodak Tri-X"* for graphic B&W.
5. **Texture/imperfection cues** — *"visible skin pores, natural micro-texture, subtle imperfections."*
6. **Composition** — where the subject sits in frame (ties back to rule of thirds), what's negative space for the text overlay to sit in later.
7. **Negative prompts** — always exclude: *no text, no watermark, no plastic skin, no oversaturation, no generic gradient, no extra fingers, no distorted logo.*

## Model selection (2026)
- Best all-round for clean photographic hero visuals: **GPT Image / Nano Banana Pro** (also best "grounded" accuracy for real product shapes).
- Best for fast iteration/drafts: **Flux** family.
- If a design genuinely needs AI-rendered text (rare — background signage, texture only): **Ideogram** is the typography specialist; never use it for final customer-facing copy regardless.
