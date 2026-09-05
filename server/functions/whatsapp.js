// ============================================================
// /.netlify/functions/whatsapp  — WhatsApp generation bot (Meta Cloud API)
//
// GET  = webhook verification (Meta calls this once with hub.challenge).
// POST = incoming messages: a linked user texts a prompt, we charge credits,
//        generate an image, and send it back on WhatsApp.
//
// Comes online once these Netlify env vars are set:
//   WHATSAPP_VERIFY_TOKEN  (any string you choose; paste same in Meta dashboard)
//   WHATSAPP_TOKEN         (permanent access token from Meta)
//   WHATSAPP_PHONE_ID      (your WhatsApp Business phone number ID)
// Users link their number in the studio Profile (saved as profiles.wa_phone).
// ============================================================
const { admin } = require('./_supabase');
const { muapiGenerate } = require('./_muapi');

const GRAPH = 'https://graph.facebook.com/v19.0';

async function sendText(to, body) {
  await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'text', text: { body } }),
  });
}
async function sendImage(to, url, caption) {
  await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_ID}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to, type: 'image', image: { link: url, caption } }),
  });
}

exports.handler = async (event) => {
  // 1) Verification handshake
  if (event.httpMethod === 'GET') {
    const q = event.queryStringParameters || {};
    if (q['hub.mode'] === 'subscribe' && q['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN) {
      return { statusCode: 200, body: q['hub.challenge'] };
    }
    return { statusCode: 403, body: 'forbidden' };
  }
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'no' };
  if (!process.env.WHATSAPP_TOKEN) return { statusCode: 200, body: 'not connected' };

  let payload; try { payload = JSON.parse(event.body); } catch (e) { return { statusCode: 200, body: 'ok' }; }
  const msg = payload?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg || msg.type !== 'text') return { statusCode: 200, body: 'ok' };

  const from = msg.from;                       // sender's WhatsApp number
  const text = (msg.text.body || '').trim();
  const db = admin();

  // Find the linked account.
  const { data: profile } = await db.from('profiles').select('id, credits').eq('wa_phone', from).maybeSingle();
  if (!profile) {
    await sendText(from, `👋 Welcome to Fuse Studio! Link this WhatsApp number in your account (Profile → Link WhatsApp) at ${process.env.APP_URL || 'your site'} to start generating.`);
    return { statusCode: 200, body: 'ok' };
  }

  const COST = 1;
  const { data: balance } = await db.rpc('spend_credits', { uid: profile.id, amount: COST });
  if (balance === null) { await sendText(from, '⚠️ You are out of credits. Top up in the app to keep creating.'); return { statusCode: 200, body: 'ok' }; }

  await sendText(from, '✨ Creating your image… give me a moment.');
  try {
    const r = await muapiGenerate({ prompt: text, model: 'flux-schnell', aspect: '9:16' });
    if (!r.url) throw new Error('no image');
    await db.from('generations').insert({ user_id: profile.id, type: 'image', model: 'flux-schnell', prompt: text, output_url: r.url, credits_spent: COST, cost_usd: r.cost_usd });
    await sendImage(from, r.url, `Done ✅  (${balance} credits left)`);
  } catch (e) {
    await db.rpc('add_credits', { uid: profile.id, amount: COST, why: 'refund' });
    await sendText(from, '⚠️ That one failed — your credit was refunded. Try again?');
  }
  return { statusCode: 200, body: 'ok' };
};
