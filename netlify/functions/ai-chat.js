// ============================================================
// POST /.netlify/functions/ai-chat   (Fuse Reactor — multi-AI text hub)
// Auth required. Body: { model, prompt }
// Routes to Claude / Gemini / GPT via OpenRouter (one key, many models),
// charging credits per message. Comes online once OPENROUTER_API_KEY is set
// in Netlify — until then it returns a friendly "not connected" message.
// ============================================================
const { admin, getUser, json } = require('./_supabase');
const { REACTOR_COST } = require('./_packs');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const key = process.env.OPENROUTER_API_KEY;
  if (!key) return json(503, { error: 'Fuse Reactor is being connected — text AIs come online once your AI key is added.', code: 'NOT_CONNECTED' });

  const user = await getUser(event);
  if (!user) return json(401, { error: 'Please sign in again.' });

  let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
  const model = body.model || 'google/gemini-flash-1.5';
  const prompt = (body.prompt || '').trim();
  const cost = REACTOR_COST[model];
  if (!prompt) return json(400, { error: 'Type a message first.' });
  if (!cost) return json(400, { error: 'Unknown model.' });

  const db = admin();
  const { data: balance } = await db.rpc('spend_credits', { uid: user.id, amount: cost });
  if (balance === null) return json(402, { error: 'Not enough credits.', code: 'NO_CREDITS' });

  try {
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error((data.error && data.error.message) || 'AI error');
    const text = data.choices && data.choices[0] && data.choices[0].message.content;
    return json(200, { text, credits: balance });
  } catch (e) {
    await db.rpc('add_credits', { uid: user.id, amount: cost, why: 'refund' });
    return json(502, { error: e.message || 'AI failed', refunded: cost });
  }
};
