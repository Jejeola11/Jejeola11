// ============================================================
// AI Video & UGC Studio — THE SHOT-PLAN ENGINE (shared brain, no network).
//
// The studio's premise: a user uploads a video they want to recreate, we pull
// its frames, and hand back a plan they can actually execute — a shot-by-shot
// breakdown, a start-frame image prompt for every shot, a motion prompt for
// every shot, and the CapCut edit that assembles it.
//
// WHY A PLAN AND NOT A REGENERATION
// You cannot feed a reference video to an image model and get "the same video
// with my product in it". What you CAN do is read the reference's structure —
// how it opens, how many cuts, where the product enters, how it closes — and
// rebuild that structure around a different product. The structure is the
// transferable part; the pixels are not. So this engine outputs a recipe, and
// the user's own modifications (their product, their avatar direction) are
// applied to the recipe before any generation happens.
//
// The output shape mirrors the course's own four-step workflow so the studio
// and the lessons teach the same thing: start frame -> motion prompt ->
// generate -> edit.
// ============================================================

// Shot grammar. Naming a shot type is what stops every generated frame being
// the same flat mid-shot, which is the most common tell of AI video.
const SHOT_TYPES = ['establishing', 'product-hero', 'talking-head', 'insert-detail', 'hands-demo', 'reaction', 'end-card'];

// Applied to every start-frame prompt. These are the defaults an image model
// reaches for that instantly read as "AI advert" rather than "someone filmed
// this on a phone".
const FRAME_NEGATIVES = [
  'no lens flare, bloom or hazy glow',
  'no over-smoothed plastic skin, keep pores and real texture',
  'no perfectly symmetrical centred composition',
  'no floating product — it is held, resting on a surface, or in a real place',
  'no extra text, captions, logos, watermarks or UI overlays',
  'no dead-clean studio void unless the reference actually uses one',
  'no sixth finger, no merged fingers — keep hands simple and partly out of frame',
];

// Motion prompts fail differently from image prompts: they fail by asking for
// too much. One action per shot is the single most useful rule in the whole
// engine.
const MOTION_RULES = [
  'ONE action per shot — a person who lifts, turns, smiles and walks will melt',
  'describe what MOVES, not what things look like; the start frame already fixed the look',
  'name the camera move explicitly, or say the camera is locked off',
  '5-8 seconds per shot; join clips rather than generating one long take',
  'the last frame of a shot can become the start frame of the next — that is how cuts disappear',
];

function buildAnalysisPrompt(frameCount, durationSec) {
  return `You are a senior short-form video director. You are shown ${frameCount} frames sampled evenly from a ${durationSec}-second reference video, in order.

Your job is to reverse-engineer HOW IT WAS MADE so someone can rebuild the same structure around a different product. You are not describing the video — you are writing a shooting plan.

READ THE REFERENCE FOR:
- How it opens. The first second decides whether anyone watches; say exactly what happens in it.
- The cut rhythm. How many distinct shots, and roughly how long each is held.
- Where the product first appears, and how it is revealed.
- Who is in it, how they are framed, and what they are doing with their hands.
- The lighting and setting — is this a bedroom, a kitchen counter, a street, a seamless backdrop?
- How it closes, and whether there is an end card.

THEN WRITE THE PLAN. For every shot:
- a shot type from: ${SHOT_TYPES.join(', ')}
- how long it is held
- a START FRAME prompt: a complete, self-contained image prompt for the first frame of that shot. Name the framing, the subject, the setting, the light direction and the mood. This is a still — no motion words.
- a MOTION prompt: what moves, in one action. ${MOTION_RULES[0]}. ${MOTION_RULES[1]}.

RULES
${MOTION_RULES.map((r) => '- ' + r).join('\n')}
- Never name a real brand, franchise or real person. If the reference shows one, describe the object generically.
- The plan must be executable by someone with a phone and no camera.`;
}

function buildSchemaPrompt() {
  return `OUTPUT — one JSON object, no prose around it, no markdown fence.

{
  "summary": "two sentences on what this video is and why it works",
  "format": { "aspect": "9:16", "durationSec": 22, "shotCount": 5, "pace": "fast" },
  "hook": "what happens in the first 1.5 seconds, precisely",
  "shots": [
    {
      "n": 1,
      "type": "product-hero",
      "holdSec": 4,
      "description": "what the viewer sees",
      "framePrompt": "self-contained still-image prompt for this shot's first frame",
      "motionPrompt": "the one thing that moves",
      "note": "optional gotcha for this shot"
    }
  ],
  "fullVideoPrompt": "one paragraph describing the whole video as a single continuous piece, for tools that take a single prompt",
  "capcut": {
    "steps": ["ordered, specific edit steps"],
    "captions": "caption style and placement",
    "sound": "what kind of audio and where the beat should land",
    "export": "resolution, aspect and frame rate"
  },
  "watchOuts": ["the two or three things most likely to go wrong when rebuilding this"]
}

Between 3 and 8 shots. Every framePrompt must stand alone — it will be sent to an image model on its own with no other context.`;
}

/**
 * Fold the user's modifications into a plan. This is the step that makes the
 * output theirs rather than a copy of the reference: their product replaces
 * whatever the reference showed, their avatar direction replaces the person.
 * Applied as an amendment per shot rather than a rewrite, so the STRUCTURE —
 * the part actually worth copying — survives intact.
 */
function applyModifications(plan, mods) {
  const product = (mods && mods.product || '').trim();
  const avatar = (mods && mods.avatar || '').trim();
  const extra = (mods && mods.notes || '').trim();
  if (!product && !avatar && !extra) return plan;

  const amend = [
    product && `THE PRODUCT IS NOT THE REFERENCE'S PRODUCT. Replace it everywhere with: ${product}. Keep the framing, the handling and the reveal exactly as described.`,
    avatar && `THE PERSON IS: ${avatar}. Keep their appearance identical across every shot — same face, same hair, same clothing.`,
    extra,
  ].filter(Boolean).join(' ');

  return Object.assign({}, plan, {
    shots: (plan.shots || []).map((s) => Object.assign({}, s, {
      framePrompt: `${s.framePrompt}\n\nAMENDMENT: ${amend}`,
      motionPrompt: s.motionPrompt,
    })),
    fullVideoPrompt: `${plan.fullVideoPrompt}\n\nAMENDMENT: ${amend}`,
    _modified: true,
  });
}

/** Attach the de-AI negatives to a single shot's frame prompt at generation time. */
function buildFramePrompt(shot, plan) {
  const aspect = (plan.format && plan.format.aspect) || '9:16';
  return [
    shot.framePrompt,
    '',
    `FORMAT: ${aspect}, a single still frame from a real short-form video — it should look filmed, not rendered.`,
    `HARD NEGATIVES: ${FRAME_NEGATIVES.join('; ')}.`,
  ].join('\n');
}

/** Structural repair. Same principle as the flyer engine: a malformed plan
 *  renders as a confusing guide rather than an error, so drift is fixed and
 *  reported instead of shipped silently. */
function validatePlan(raw) {
  const problems = [];
  const plan = Object.assign({}, raw);

  plan.summary = String(plan.summary || '').slice(0, 600);
  plan.hook = String(plan.hook || '').slice(0, 400);
  plan.format = Object.assign({ aspect: '9:16', durationSec: 20, shotCount: 0, pace: 'medium' }, plan.format || {});
  if (!/^\d+:\d+$/.test(plan.format.aspect)) { plan.format.aspect = '9:16'; problems.push('bad aspect'); }

  plan.shots = (Array.isArray(plan.shots) ? plan.shots : []).slice(0, 8).map((s, i) => {
    const shot = Object.assign({}, s);
    shot.n = i + 1;
    if (!SHOT_TYPES.includes(shot.type)) { problems.push(`shot ${i + 1}: unknown type "${shot.type}"`); shot.type = 'product-hero'; }
    shot.holdSec = Math.min(15, Math.max(1, Number(shot.holdSec) || 4));
    shot.description = String(shot.description || '').slice(0, 500);
    shot.framePrompt = String(shot.framePrompt || '').slice(0, 2000);
    shot.motionPrompt = String(shot.motionPrompt || '').slice(0, 800);
    if (!shot.framePrompt) problems.push(`shot ${i + 1}: no frame prompt`);
    if (!shot.motionPrompt) problems.push(`shot ${i + 1}: no motion prompt`);
    return shot;
  });
  if (!plan.shots.length) problems.push('plan has no shots');
  plan.format.shotCount = plan.shots.length;

  plan.fullVideoPrompt = String(plan.fullVideoPrompt || '').slice(0, 3000);
  const cc = plan.capcut || {};
  plan.capcut = {
    steps: (Array.isArray(cc.steps) ? cc.steps : []).slice(0, 20).map((x) => String(x).slice(0, 400)),
    captions: String(cc.captions || '').slice(0, 500),
    sound: String(cc.sound || '').slice(0, 500),
    export: String(cc.export || '').slice(0, 300),
  };
  if (!plan.capcut.steps.length) problems.push('no CapCut steps');
  plan.watchOuts = (Array.isArray(plan.watchOuts) ? plan.watchOuts : []).slice(0, 6).map((x) => String(x).slice(0, 300));

  return { plan, problems };
}

module.exports = {
  SHOT_TYPES, FRAME_NEGATIVES, MOTION_RULES,
  buildAnalysisPrompt, buildSchemaPrompt, applyModifications, buildFramePrompt, validatePlan,
};
