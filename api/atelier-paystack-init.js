// Fuse Atelier founding-access Paystack checkout.
// Server-side amount is fixed at ₦15,000. No browser-provided price is trusted.
const crypto = require('crypto');

const PRICE_KOBO = 1500000;
const CALLBACK_URL = 'https://fuse-atelier.vercel.app/api/atelier-paystack-callback';

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  if (req.method === 'GET') {
    return send(res, 200, { ok: true, configured: !!process.env.PAYSTACK_SECRET_KEY });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });

  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return send(res, 500, { error: 'Payment system is not configured yet.' });

  const email = 'fuse-' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '@fuseatelier.ng';

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: PRICE_KOBO,
        currency: 'NGN',
        channels: ['bank_transfer', 'card', 'bank', 'ussd'],
        callback_url: CALLBACK_URL,
        metadata: {
          product: 'Fuse Atelier Founding Access',
          amount_naira: 15000,
          source: 'atelier-landing-page',
          custom_fields: [
            { display_name: 'Offer', variable_name: 'offer', value: 'Founding Access — ₦15,000' }
          ]
        }
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.status || !data.data || !data.data.authorization_url) {
      return send(res, 502, { error: data.message || 'Could not start Paystack checkout.' });
    }

    return send(res, 200, { authorization_url: data.data.authorization_url });
  } catch (err) {
    return send(res, 502, { error: 'Could not connect to Paystack. Please try again.' });
  }
};
