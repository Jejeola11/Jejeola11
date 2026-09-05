// ============================================================
// Video Editing Studio — the editing "brain" behind the conversational
// assistant. Real findings so far (video-folder deep-dive + general viral
// short-form research were still running in the background when this was
// first written — strengthen this file once those land):
//   - Afnan Khalifa's account: bold declarative aphorism as the on-screen
//     hook text, with only 2-4 specific words capitalized per sentence
//     (mimics vocal stress, makes it screenshot-quotable) rather than a
//     literal transcript running as captions.
//   - Comment-keyword CTAs ("Comment 'X' and I'll send you the link")
//     outperform "link in bio" — forces algorithmically-favorable comments
//     and builds a DM list at the same time.
//   - A minority of a feed being overt offers (most content is opinion/
//     lifestyle/value) keeps a personal-brand account feeling authentic
//     rather than like a constant funnel.
// ============================================================

const CAPTION_STYLE_GUIDE = `CAPTION STYLE (what actually performs, not generic subtitles):
- Bold, big, high-contrast text — never small "closed caption" style. White text with a black outline reads reliably over any background.
- Phrase-by-phrase cards (2-4 words, ~2 seconds each) synced to speech, not full-sentence blocks sitting on screen too long.
- Selective emphasis: capitalize or color 1-3 KEY words per sentence (the words carrying the actual claim), not the whole line — this mimics vocal stress and makes a single frame quotable/screenshot-worthy on its own.
- Position: lower-third by default (out of the way of a talking-head's face), unless the hook specifically wants to sit near the top for a "headline" feel.`;

const CTA_GUIDE = `CTA MECHANICS:
- "Comment '<WORD>' and I'll send you <the thing>" outperforms a plain "link in bio" — it drives an algorithm-favored engagement signal (comments) AND builds a reachable list simultaneously.
- Keep the CTA word short, easy to type, and specific to the content (not a generic "yes").
- Urgency helps when there's a real reason for it (a cohort start date, a closing cart) — don't fake urgency that isn't true.`;

const HOOK_GUIDE = `HOOK (first 1-3 seconds) — this is what decides if anyone keeps watching:
- Bold declarative claim, a pattern interrupt, or a direct callout of the viewer's situation — not a slow warm-up or a "hi guys" opener.
- The hook should also exist as on-screen text in the first frame, not rely on audio alone (most viewers watch muted first).
- One core idea per video. A video trying to make three points loses all three.`;

const EDIT_CONVENTIONS = `GENERAL EDIT CONVENTIONS FOR THIS FORMAT:
- Cut on energy, not on a fixed rhythm — remove dead air and filler, keep pace tight.
- B-roll/cutaways exist to punctuate a claim (show the thing being talked about) or to hide a jump cut, not just to look busy.
- Uploaded elements (screenshots, proof, logos) work best appearing exactly when they're referenced verbally, not floating the whole video.
- End on the CTA, not on a fade-out — the last thing seen should be the ask.`;

function buildEditingBrainPrompt() {
  return [HOOK_GUIDE, CAPTION_STYLE_GUIDE, CTA_GUIDE, EDIT_CONVENTIONS].join('\n\n');
}

module.exports = { CAPTION_STYLE_GUIDE, CTA_GUIDE, HOOK_GUIDE, EDIT_CONVENTIONS, buildEditingBrainPrompt };
