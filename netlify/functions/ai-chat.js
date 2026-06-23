// ============================================================
// POST /.netlify/functions/ai-chat   (Fuse Reactor — multi-AI text hub)
// Auth required. Body: { model, prompt }
// Routes to Claude / ChatGPT / Gemini via MuAPI (your existing MUAPI_KEY),
// charging credits per message. Same submit + poll pattern as image gen.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { REACTOR_COST } = require('./_packs');

const MUAPI_BASE = 'https://api.muapi.ai/api/v1';

function extractText(p) {
  if (!p) return '';
  if (typeof p.output === 'string') return p.output;
  if (typeof p.text === 'string') return p.text;
  if (typeof p.result === 'string') return p.result;
  if (Array.isArray(p.outputs) && p.outputs.length) return String(p.outputs[0]);
  if (p.choices && p.choices[0] && p.choices[0].message) return p.choices[0].message.content;
  if (p.output && typeof p.output === 'object') return p.output.text || JSON.stringify(p.output);
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
  const cost = REACTOR_COST[model];
  if (!prompt) return json(400, { error: 'Type a message first.' });
  if (!cost) return json(400, { error: 'Unknown model.' });

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  const key = process.env.MUAPI_KEY;
  try {
    const submit = await fetch(`${MUAPI_BASE}/${model}`, {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });
    const txt = await submit.text();
    let j; try { j = JSON.parse(txt); } catch (e) { throw new Error('Engine error: ' + txt.slice(0, 140)); }
    if (!submit.ok) throw new Error((j && (j.error || j.message)) || ('Engine HTTP ' + submit.status));

    // Some text models return immediately; others need a poll.
    let text = extractText(j);
    const id = j.request_id || j.id;
    for (let i = 0; i < 40 && !text && id; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const p = await (await fetch(`${MUAPI_BASE}/predictions/${id}/result`, { headers: { 'x-api-key': key } })).json();
      if (p.status === 'failed' || p.status === 'cancelled') throw new Error('AI ' + p.status);
      text = extractText(p);
      if (p.status === 'completed' && !text) break;
    }
    if (!text) throw new Error('No response from the model.');
    return json(200, { text, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'AI failed', refunded: cost });
  }
};
