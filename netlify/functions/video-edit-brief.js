// ============================================================
// POST /.netlify/functions/video-edit-brief   (Video Editing Studio — edit assistant)
// Body: { message, history?, project_id? }
// Acts as a senior short-form video editor: reasons from the transcript (if
// transcribed yet) plus the embedded editing knowledge (_video-knowledge.js)
// to propose caption styling, a CTA, and b-roll/element suggestions —
// aimed squarely at making the edit convert, not just look nice.
// Async submit + poll via job-status.js (kind:'flyer-brief' branch is
// reused for text-JSON kinds — see isTextKind in job-status.js).
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { REACTOR_COST, canUseFree } = require('./_packs');
const { buildEditingBrainPrompt } = require('./_video-knowledge');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';
const MODEL = 'claude-sonnet-4-5';

const SYSTEM_PREAMBLE = `You are the senior short-form video editor inside "Video Editing Studio." You are having a real editing conversation with the user, working from their uploaded video's transcript (when available) and their instructions — the goal is a genuinely attention-grabbing, conversion-ready edit, not just a technically correct one.

${buildEditingBrainPrompt()}

IMPORTANT CAVEATS:
- You do not have live web-search access — reason from the framework above plus your own training knowledge.
- You cannot literally watch the video. Work from the transcript text and timing the user/system gives you, plus what they describe about the footage.
- You do not generate b-roll footage yourself — if the user wants generated b-roll, tell them to make it in the general Video/Image Studio and come back to add it as an element at a timestamp.

RESPONSE FORMAT — this is critical, read carefully: respond with PLAIN TEXT using the exact tags below, NOT JSON, NOT markdown code fences. Write freely inside each tag — full sentences, quotes, apostrophes, line breaks are all fine, nothing needs escaping. Every tag must appear even if its content is empty:

<REPLY>
Your conversational response — proposed direction or a clarifying question.
</REPLY>
<CAPTION_COLOR>
A hex color, e.g. #00e0c6 — or leave empty.
</CAPTION_COLOR>
<CAPTION_POSITION>
bottom or top — or leave empty.
</CAPTION_POSITION>
<CTA_TEXT>
The exact on-screen CTA text to burn in, e.g. COMMENT "AI" BELOW — or leave empty if not decided yet.
</CTA_TEXT>
<BROLL_SUGGESTIONS>
- one short suggestion per line, starting with a dash
</BROLL_SUGGESTIONS>
<NOTES>
Any other specific edit notes — cuts to make, moments to emphasize — or leave empty.
</NOTES>`;

function extractText(p) {
  if (!p) return '';
  if (typeof p.output === 'string') return p.output;
  if (typeof p.text === 'string') return p.text;
  if (typeof p.result === 'string') return p.result;
  if (Array.isArray(p.outputs) && p.outputs.length) return String(p.outputs[0]);
  if (p.choices && p.choices[0] && p.choices[0].message) return p.choices[0].message.content;
  if (p.output && typeof p.output === 'object') return p.output.text || '';
  return '';
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!process.env.MUAPI_KEY) return json(503, { error: 'Editing Studio is being connected (MUAPI_KEY missing).' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const message = (body.message || '').trim();
  const history = Array.isArray(body.history) ? body.history.slice(-12) : [];
  if (!message) return json(400, { error: 'Describe the edit you want.' });

  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  const cost = REACTOR_COST[MODEL];
  if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
    return json(403, { error: 'The editing assistant requires a subscription.', code: 'PLAN_REQUIRED' });
  }

  const db = admin();
  let project = null;
  if (body.project_id) {
    const { data } = await db.from('video_edit_projects').select('*').eq('id', body.project_id).maybeSingle();
    if (data && data.user_id === user.id) project = data;
  }
  if (!project) return json(400, { error: 'Upload and transcribe a video first.' });

  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    const convo = history.map((h) => `${h.role === 'assistant' ? 'YOU' : 'USER'}: ${h.text}`).join('\n');
    const transcriptText = project.transcript && project.transcript.text ? project.transcript.text.slice(0, 4000) : null;
    const transcriptNote = transcriptText ? `\n\nVideo transcript:\n"""${transcriptText}"""` : '\n\n(No transcript yet — reason from the user\'s description alone.)';
    const fullPrompt = `${SYSTEM_PREAMBLE}${transcriptNote}\n\n${convo ? convo + '\n' : ''}USER: ${message}`;

    const sub = await fetch(`${MUAPI_BASE}/${MODEL}`, {
      method: 'POST', headers: { 'x-api-key': process.env.MUAPI_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: fullPrompt }),
    });
    const txt = await sub.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!sub.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + sub.status));
    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not return a job id.');

    const immediate = extractText(j);
    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'video-edit-brief', model: MODEL, prompt: message, credits: cost,
      status: immediate ? 'completed' : 'processing', output_text: immediate || null, project_id: project.id,
    });
    return json(200, { request_id: id, credits: balance, project_id: project.id });
  } catch (e) {
    try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: e.message || 'Editing assistant failed', refunded: cost });
  }
};
