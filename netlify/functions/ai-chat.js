// ============================================================
// POST /.netlify/functions/ai-chat   (Fuse Reactor — multi-AI text hub)
// Auth required. Body: { model, prompt, images }
// Routes to Claude / ChatGPT / Gemini via MuAPI, charging credits per message.
// Submits the job and returns immediately — a serverless function can be
// killed by the platform before a long Claude/GPT/Gemini reply (especially
// with an image attached) finishes, so the browser polls job-status.js for
// the result instead of this function blocking until it's done (same pattern
// video generation already uses, since video renders take even longer).
// ============================================================
const { admin, getUser, json, getPlan } = require('./_supabase');
const { REACTOR_COST, canUseFree } = require('./_packs');
const { chatCompletion, hasWaveSpeed } = require('./_providers');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!hasWaveSpeed()) return json(503, { error: 'Engine not connected (WAVESPEED_KEY missing).' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const model = body.model || 'gemini-2-5-flash';
  const prompt = (body.prompt || '').trim();
  const images = (Array.isArray(body.images) ? body.images : []).filter((u) => typeof u === 'string' && u).slice(0, 1);
  const cost = REACTOR_COST[model];
  if (!prompt) return json(400, { error: 'Type a message first.' });
  if (!cost) return json(400, { error: 'Unknown model.' });

  // Plan gating — free users only get the basic AIs. Default to 'pro' on error.
  let plan = 'pro', isAdmin = false;
  try { const p = await getPlan(user.id); plan = p.plan; isAdmin = p.isAdmin; } catch (e) {}
  if (plan === 'free' && !isAdmin && !canUseFree(model)) {
    return json(403, { error: 'This AI requires a subscription. Upgrade to unlock all models.', code: 'PLAN_REQUIRED' });
  }

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    // WaveSpeed's LLM endpoint is genuinely synchronous, so this now
    // answers directly in this same call — the synthetic id below only
    // exists so the frontend's existing poll-once flow keeps working
    // unchanged (job-status.js sees status already 'completed').
    const text = await chatCompletion({ prompt, imageUrl: images[0], model });
    const id = 'wsllm-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'chat', model, prompt, credits: cost,
      status: 'completed', output_text: text,
    });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'AI failed', refunded: cost });
  }
};
