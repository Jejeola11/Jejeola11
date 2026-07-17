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
const { extractErrorMessage } = require('./_errors');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

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
  if (!process.env.MUAPI_KEY) return json(503, { error: 'Engine not connected (MUAPI_KEY missing).' });

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

  const key = process.env.MUAPI_KEY;
  try {
    // Confirmed against MuAPI's own /models/{slug} schema for every Reactor text
    // model (claude-sonnet-4-5, claude-opus-4-5, claude-haiku-4-5, gpt-5-5,
    // gpt-5-2, gemini-2-5-pro, gemini-2-5-flash): the only image field they
    // accept is a SINGULAR "image_url" string.
    const payload = { prompt };
    if (images.length) payload.image_url = images[0];
    const submit = await fetch(`${MUAPI_BASE}/${model}`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const txt = await submit.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!submit.ok) { console.error('[ai-chat] MuAPI rejected the request:', txt.slice(0, 500)); throw new Error(extractErrorMessage(j) || ('Engine HTTP ' + submit.status)); }

    const id = j.request_id || j.id;
    if (!id) throw new Error('Engine did not return a job id.');
    // Some models answer immediately in the submit response — save the trip.
    const immediate = extractText(j);
    await db.from('jobs').insert({
      request_id: id, user_id: user.id, kind: 'chat', model, prompt, credits: cost,
      status: immediate ? 'completed' : 'processing', output_text: immediate || null,
    });
    return json(200, { request_id: id, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'AI failed', refunded: cost });
  }
};
