// ============================================================
// Flyer Studio — the design "brain" behind the conversational assistant.
// Everything here comes from real research (not invented on the spot):
//   - The 7-layer ANCHOR template + 3 sub-recipes: reverse-engineered from
//     48 flyers the founder hand-picked as the quality bar (viewed and
//     analyzed individually, not guessed from filenames).
//   - The niche-research method + WEB3_NOTES: from a live research pass on
//     what real shipped web3/crypto brands (Coinbase, Uniswap, ENS, Sky/
//     MakerDAO) actually do, which explicitly AVOID the generic purple-
//     gradient/neon-on-black cliché that's now called out by name as a
//     2026 "AI tell" — the opposite of what a naive "web3 flyer" guess
//     would produce.
//   - DE_AI_RULES: from a research pass on why AI images read as fake
//     (plastic skin, forced symmetry, garbled text, flat lighting) and the
//     concrete prompt-language fixes (camera/lens specs, negative prompts,
//     natural imperfection, film grain).
//   - LAYOUT_FUNDAMENTALS: classic hierarchy/grid/C.R.A.P. principles,
//     corroborated across multiple design-education sources.
//
// IMPORTANT — what "research" means here in production: this module is
// static, pre-researched knowledge embedded in the assistant's prompt. There
// is no live web-search API wired into this codebase, so a brand-new niche
// isn't freshly Googled at request time — the assistant reasons from this
// framework + its own training knowledge, following NICHE_METHOD to infer
// an authentic (not stereotyped) visual language. Be upfront about that
// distinction rather than implying live search happens on every message.
// ============================================================

const ANCHOR_TEMPLATE = `THE ANCHOR TEMPLATE (7 layers, derived from 48 real reference flyers):
1. THE FIELD (background) — never flat plain white. Either a dark-to-color gradient (radial or diagonal) or one saturated flat fill, optionally one quiet texture pass (fine grid, circuit/hex pattern, damask repeat, halftone dot-screen, or one giant oversized watermark word) kept low-contrast enough to read as atmosphere, never competing with the headline.
2. THE HERO — one dominant photoreal or CGI subject, lit with a single clear directional key light. A person is shot chest-up or waist-up, direct gaze, confident stance. A product substitutes one dramatic supporting prop doing the emotional work a tagline would otherwise carry.
3. ONE ACCENT COLOR THAT POPS — exactly one saturated hue reused in the headline gradient, bullet icons, price/date badge, and CTA button, while everything else stays dark/neutral/desaturated. Strongest work color-matches this accent to the subject's own wardrobe or a rim/gel light so it reads as directed, not decorative.
4. HEADLINE ZONE — protected negative space, upper-third to mid-frame, NEVER crossing the subject's face. Heavy condensed display sans at ~3-5x body size, split 2-3 lines, one word breaking into the accent-color gradient or a contrasting script.
5. THE INFORMATION CARD — bullets/pricing live inside one rounded card (solid dark panel or glass), beside or below the hero, never over it. One small repeating icon per bullet in the accent color; 1-2 keywords recolored per line, never the whole sentence.
6. SIGNATURE MICRO-MOTIF — 1-2 small ornaments repeating 2-4 times (sparkle/star, sticker-seal badge, hand-drawn underline swipe, icon-in-rounded-square chip, QR code). Never more than two distinct motifs per flyer.
7. THE CONTACT FOOTER — a fixed bottom strip/pill bar, visually separated by a color break or shape change, holding phone/handle/QR/website — styled as UI chrome, not "art."`;

const SUB_RECIPES = `SUB-RECIPES (use instead of the full 7-layer stack when the brief calls for it):
- PORTFOLIO/SHOWCASE MODE: drop layers 4-5 (headline+bullets). Replace the hero with a grid/fan of past work, add one bold two-tone wordmark, keep the accent color and footer.
- PURE PRODUCT MODE: drop the headline, info card, and footer entirely. One hero object, one dramatic supporting prop, one considered gradient field, huge negative space. Highest production-value feel.
- CONCEPT/NOVELTY MODE: break the recipe on purpose — one bold visual metaphor or literal pun carries 100% of the message, with little or no chrome. Reads as the most "viral"/original precisely because it looks nothing like a templated ad.`;

const SCAFFOLD = `FILL-IN-THE-BLANK PROMPT SCAFFOLD (use this shape for the image-generation prompt — background/hero visual only, ZERO text/logos/words rendered by the image model):
Portrait-format flyer background, [ASPECT].
FIELD: [gradient direction + 2 colors, or one saturated flat color], optional texture: [grid/circuit/damask/halftone/watermark].
HERO: [person: pose+framing+wardrobe] OR [product + one dramatic prop], lit by [key-light direction+quality], rim/gel light color-matched to [the one accent color].
ACCENT: exactly one saturated hue — [name it] — this is the only pop of color; everything else stays [dark/neutral/desaturated].
COMPOSITION: leave clear protected negative space in the [upper-third/mid-frame], away from the hero's face, for text to be added afterward.
MEDIUM: [photoreal photography/3D render/flat vector/collage]. MOOD: [one adjective pair].
NO text, NO words, NO logos, NO watermarks, NO signage rendered in the image — pure visual only, typography is added separately.`;

const NICHE_METHOD = `NICHE-RESEARCH METHOD (apply this reasoning for ANY niche the user names, not just the ones below):
1. Identify 2-4 REAL, well-regarded brands/creators actually shipping in this niche right now (not generic stock-image tropes) — think about what they actually chose: palette, typography, motif.
2. Ask: what's the LAZY DEFAULT everyone assumes for this niche (the cliché), and what do the genuinely respected players do INSTEAD? The gap between those two is where "looks premium, not generic AI" lives.
3. Pin ONE real color-anchor (not "colors associated with X" in the abstract — a specific hue a real brand in that space actually uses) + ONE typography mood (not "futuristic font" — name a real category: Swiss geometric sans, monospace, humanist serif, condensed display, etc.) + ONE motif/illustration system tied to that niche's actual culture, not a generic icon set.
4. Prefer restraint over maximalism: 1-2 colors + 1-2 typefaces, always. The niche's authenticity signal is usually a SPECIFIC choice, not "more of everything associated with the category."`;

const WEB3_NOTES = `WEB3/CRYPTO NICHE — SPECIFIC RESEARCH FINDINGS (real, sourced 2026):
- THE CLICHÉ TO AVOID: flat indigo-to-purple gradient on black, generic geometric "futuristic" sans display type, low-poly/isometric stock 3D, abstract polygons. Named explicitly by design agencies (Distractive, Avark) and design critics as tired, "AI-coded," copy-paste — indigo→purple gradient is called "the single loudest AI tell in 2026."
- WHAT REAL SHIPPED BRANDS DO INSTEAD: tightly restrained 1-2 color palettes with ONE saturated accent — Coinbase's Blue Ribbon #0052FF against white/near-black, Uniswap's electric pink/magenta #FF007A against black, ENS's blue/black/white only, Ethereum Foundation's black/grey/white (deliberately avoiding the purple cliché "to symbolize clarity and transparency"). Sky (MakerDAO's rebrand) went warm/optimistic with a "portal/horizon" motif instead of dark/neon.
- TYPOGRAPHY: Swiss-clean geometric sans (Uniswap) or a considered monospace (Space Mono, JetBrains Mono, Geist Mono) used as a full brand system for "engineering credibility" — NOT sci-fi/faux-futuristic display faces, which read as beginner/template work.
- GRADIENTS, IF USED: current good work uses cinematic, diffused, soft-glow/mesh/ambient-lighting gradients (photographic-feeling), never a flat CSS-swatch-style rainbow blend.
- GLASSMORPHISM: current work (Aave Glass) treats it as simulated light refraction (lenses, sliders that refract what's beneath them), not flat translucent decorative panels.
- MOTIF SYSTEMS ARE COMMUNITY-SPECIFIC, not generic "blockchain" icons: Azuki = anime-samurai clean line-work; Doodles = pastel whimsical characters; Pudgy Penguins = hand-drawn, toy-retail-friendly, deliberately NOT "crypto-coded" at all.
- ACTIONABLE RULE: pick ONE strong brand-color anchor + ONE considered typeface family (often monospace detail + clean geometric/Swiss sans headline) + ONE motif system tied to the specific project's own identity. Treat flat indigo-purple-on-black + generic low-poly/circuit stock art as the pattern to actively avoid unless the user deliberately wants the recognizable "crypto Twitter" convention on purpose (which is a valid choice too — just make it a deliberate one, not a lazy default).`;

const DE_AI_RULES = `ANTI-"AI LOOK" RULES (apply to every image-generation prompt):
- Never let the image model render final text, logos, or legible signage — that is composited afterward in code. Say so explicitly in every image prompt: "no text, no words, no logos, no watermarks."
- Specify real camera/lens language when photoreal: sensor+lens+aperture (e.g. "shot on a Sony A7IV, 50mm f/1.8, shallow depth of field"), a specific lighting description ("soft window light from camera-left," "golden-hour rim light") instead of vague "cinematic lighting."
- Add natural-imperfection language: visible skin texture/pores, subtle asymmetry, fine film grain, natural blemishes — perfect symmetry and glass-smooth skin are the fastest way to read as fake.
- Use negative-prompt-style language against the known tells: no plastic/waxy skin, no glossy over-smoothed surfaces, no uncanny facial symmetry, no generic gradient-swatch background, no repeated/tiled pattern artifacts.
- Ground the environment: coherent light-shadow interplay, one clear key-light direction, named real materials/textures ("brushed steel," "weathered leather") rather than generic surface adjectives.
- Prefer a candid, mid-gesture, "unaware of camera" framing over a stiff centered pose when a person is the hero — breaks the default posed-AI-portrait look.`;

const LAYOUT_FUNDAMENTALS = `CLASSIC LAYOUT PRINCIPLES (corroborated across design-education sources — apply alongside the anchor template):
- One focal point per flyer. One core message. Competing headlines/ideas kill a design faster than any color choice.
- Hierarchy via size + weight + color, in that order of impact — never more than 2-3 colors total, never more than 2 (max 3) typefaces.
- Align everything to a grid; group related elements by proximity (icon next to its own label, not floating).
- Whitespace is not empty — it's what makes the one focal point read as important. Don't fill every inch.
- Rule-of-thirds placement for the hero/focal point outperforms dead-centering it.`;

function buildDesignBrainPrompt() {
  return [ANCHOR_TEMPLATE, SUB_RECIPES, SCAFFOLD, LAYOUT_FUNDAMENTALS, NICHE_METHOD, WEB3_NOTES, DE_AI_RULES].join('\n\n');
}

module.exports = {
  ANCHOR_TEMPLATE, SUB_RECIPES, SCAFFOLD, NICHE_METHOD, WEB3_NOTES, DE_AI_RULES, LAYOUT_FUNDAMENTALS,
  buildDesignBrainPrompt,
};
