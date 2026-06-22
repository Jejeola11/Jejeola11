// ============================================================
// POST /.netlify/functions/tool-generate   (utility tools)
// Auth required. Body: { slug, image_url, prompt? }
// Runs MuAPI utility tools (upscale, background remove, object erase) on an
// uploaded image. Same submit + poll pattern.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { TOOL_MODELS } = require('./_packs');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

async function muapiTool({ slug, image_url, prompt }) {
  const key = process.env.MUAPI_KEY;
  const payload = { image_url };
  if (prompt) payload.prompt = prompt; // e.g. object eraser target
  const submit = await fetch(`${MUAPI_BASE}/${slug}`, {
    method: 'POST', headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const txt = await submit.text();
  let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
  if (!submit.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + submit.status));
  const id = j.request_id || j.id;
  if (!id) throw new Error('Engine did not return a job id');
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 2500));
    const p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': key } })).json();
    if (p.status === 'completed') return { url: p.outputs && p.outputs[0], cost_usd: p.cost && p.cost.amount_usd };
    if (p.status === 'failed' || p.status === 'cancelled') throw new Error('Tool ' + p.status);
  }
  throw new Error('Timed out — please try again');
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });
  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }

  const slug = body.slug;
  const image_url = (body.image_url || '').trim();
  const cost = TOOL_MODELS[slug];
  if (!cost) return json(400, { error: 'Unknown tool.' });
  if (!image_url) return json(400, { error: 'Upload an image first.' });

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    const r = await muapiTool({ slug, image_url, prompt: body.prompt });
    if (!r.url) throw new Error('No output returned');
    await db.from('generations').insert({ user_id: user.id, type: 'tool', model: slug, output_url: r.url, cost_usd: r.cost_usd, credits_spent: cost });
    return json(200, { url: r.url, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'Tool failed', refunded: cost });
  }
};
