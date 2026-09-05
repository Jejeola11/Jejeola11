// ============================================================
// POST /.netlify/functions/flyer-spec   (Flyer Studio — the design spec)
// Body: { brief, project_id?, aspect?, reference_image_urls?, notes? }
//
// Turns a finished brief into a LOCKED DESIGN SPEC — the layer graph the
// editor renders from. See _flyer-spec.js for what a spec is and why the
// design is data rather than a prose prompt.
//
// This replaces the old "one prose prompt -> one flat picture" step. Nothing
// is generated here: this call only produces the plan. Image layers are
// generated afterwards, individually, so regenerating one element never
// touches the rest of the poster.
//
// Async submit + poll via job-status.js (kind 'flyer-spec' is a text kind),
// same lazy-completion pattern as flyer-brief — a full spec is a long
// response and reliably outran Netlify's function timeout when attempted
// inline. The raw JSON comes back to the client, which posts it to
// flyer-spec-save.js to be validated and stored.
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { REACTOR_COST, canUseFree } = require('./_packs');
const { buildSpecBrainPrompt, buildSpecSchemaPrompt } = require('./_flyer-spec');
const { hasWaveSpeed, triggerTextWorker } = require('./_providers');

const MODEL = 'claude-sonnet-4-5';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!hasWaveSpeed()) return json(503, { error: 'Flyer Studio is being connected (WAVESPEED_KEY missing).' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const brief = (body.brief || '').trim();
  const notes = (body.notes || '').trim();
  const aspect = (body.aspect || '').trim();
  const refs = (Array.isArray(body.reference_image_urls) ? body.reference_image_urls : []).filter(Boolean).slice(0, 20);
  if (!brief) return json(400, { error: 'Describe what you want to design first.' });

  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  const cost = REACTOR_COST[MODEL];
  if (plan === 'free' && !isAdmin && !canUseFree(MODEL)) {
    return json(403, { error: 'Flyer Studio requires a subscription.', code: 'PLAN_REQUIRED' });
  }

  const db = admin();
  let project = null;
  if (body.project_id) {
    const { data } = await db.from('flyer_projects').select('*').eq('id', body.project_id).maybeSingle();
    if (data && data.user_id === user.id) project = data;
  }

  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    // The spec model can't see the references (only the first is passed
    // through as a real image input). What it CAN do is say, per image layer,
    // which attached reference that layer should be built from — so the
    // later per-layer generation call knows to attach it. Anything vaguer
    // than an explicit index gets ignored by the image model, which is the
    // single most common way an attached reference goes unused.
    const refNote = refs.length
      ? `\n\nThe user attached ${refs.length} reference image(s), numbered 1-${refs.length} in order. You cannot see them, but each one can be passed into the generation of an individual image layer. When a layer should be built from a specific attachment, add "refIndex": <number> to that layer. Materials the user supplied (a product photo, a logo, a headshot) belong on the layer that depicts them. Inspiration flyers inform the GRID and PALETTE you choose — never copy their content, and do not attach them to a layer.`
      : '';
    const aspectNote = aspect ? `\n\nThe user wants aspect "${aspect}" — use it unless it is impossible for what they asked for.` : '';
    const notesNote = notes ? `\n\nExtra direction from the user, which outranks your defaults where they conflict:\n${notes}` : '';

    const fullPrompt = `${buildSpecBrainPrompt()}

${buildSpecSchemaPrompt()}

THE BRIEF
${brief}${notesNote}${refNote}${aspectNote}

Return ONLY the JSON object. No commentary before or after it, no markdown fence.`;

    const id = 'wsllm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);

    let projectId = project && project.id;
    if (!projectId) {
      const { data: newProj } = await db.from('flyer_projects')
        .insert({ user_id: user.id, brief, reference_image_urls: refs, aspect: aspect || '4:5' })
        .select().single();
      projectId = newProj && newProj.id;
    }

    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'flyer-spec',
      // Deliberately NO image attached. Passing one makes this a vision call,
      // which is far slower and repeatedly blew past the worker's 120s LLM
      // timeout — and it buys nothing here: the spec references attachments by
      // POSITION (refIndex), so it never needs to see them. The per-layer
      // generation call is where the actual reference image gets used.
      model: MODEL, prompt: fullPrompt, credits: cost,
      status: 'processing', project_id: projectId,
    });
    triggerTextWorker(id);
    return json(200, { request_id: id, credits: balance, project_id: projectId });
  } catch (e) {
    try { await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' }); } catch (_) {}
    return json(502, { error: e.message || 'Could not build the design spec.', refunded: cost });
  }
};
