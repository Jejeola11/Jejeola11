const crypto = require('crypto');

const PRICE_KOBO = 1500000;
const CALLBACK_URL = 'https://fuse-atelier.vercel.app/api/atelier-paystack-callback';
const json = (statusCode, body) => ({ statusCode, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') return json(200, { ok: true, configured: !!process.env.PAYSTACK_SECRET_KEY });
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  if (!secret) return json(500, { error: 'Payment system is not configured yet.' });
  const email = `fuse-${Date.now()}-${crypto.randomBytes(4).toString('hex')}@fuseatelier.ng`;
  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST', headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email, amount: PRICE_KOBO, currency: 'NGN', channels: ['card', 'bank_transfer', 'bank', 'ussd'], callback_url: CALLBACK_URL,
        metadata: { product: 'Fuse Atelier Founding Access', amount_naira: 15000, international_cards_enabled: true, source: 'atelier-landing-page' }
      })
    });
    const data = await response.json();
    if (!response.ok || !data.status || !data.data || !data.data.authorization_url) return json(502, { error: data.message || 'Could not start Paystack checkout.' });
    return json(200, { authorization_url: data.data.authorization_url });
  } catch (_) { return json(502, { error: 'Could not connect to Paystack. Please try again.' }); }
};
