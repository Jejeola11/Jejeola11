// Fuse Atelier sales-page Paystack checkout (Core / Fast Track / approved VIP).
// Prices are server-side only. The browser never decides the amount.
const crypto = require('crypto');

const PLANS = {
  atelier_core:       { label: 'Fuse Core', amount_naira: 25000 },
  atelier_fast_track: { label: 'Fuse Fast Track', amount_naira: 119000 },
  atelier_vip:        { label: 'Fuse VIP — First Client Intensive', amount_naira: 499000 },
};

const CALLBACK_URL = 'https://fuse-atelier.vercel.app/api/atelier-paystack-callback';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();

  if (req.method === 'GET') {
    return send(res, 200, {
      ok: true,
      configured: !!secret,
      plans: Object.fromEntries(Object.entries(PLANS).map(([key,p]) => [key, { label:p.label, amount_naira:p.amount_naira }]))
    });
  }
  if (req.method !== 'POST') return send(res, 405, { error: 'Method not allowed' });
  if (!secret) return send(res, 500, { error: 'Paystack is not configured yet.' });

  const body = (req.body && typeof req.body === 'object') ? req.body : (() => {
    try { return JSON.parse(req.body || '{}'); } catch (_) { return {}; }
  })();

  const pack = String(body.pack || '').trim();
  const plan = PLANS[pack];
  if (!plan) return send(res, 400, { error: 'Unknown Fuse Atelier plan.' });

  const name = String(body.name || '').trim().slice(0, 120);
  const email = String(body.email || '').trim().toLowerCase();
  if (!name) return send(res, 400, { error: 'Please enter your name.' });
  if (!EMAIL_RE.test(email)) return send(res, 400, { error: 'Please enter a valid email address.' });

  const reference = 'FUSE-' + Date.now() + '-' + crypto.randomBytes(5).toString('hex');

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + secret,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        amount: plan.amount_naira * 100,
        currency: 'NGN',
        reference,
        channels: ['card', 'bank_transfer', 'bank', 'ussd'],
        callback_url: CALLBACK_URL,
        metadata: {
          product: plan.label,
          pack,
          guest_email: email,
          name,
          source: 'fuse-atelier-sales-page',
          custom_fields: [
            { display_name: 'Offer', variable_name: 'offer', value: plan.label },
            { display_name: 'Name', variable_name: 'name', value: name },
          ],
        },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.status || !data.data?.authorization_url) {
      return send(res, 502, { error: data.message || 'Could not start Paystack checkout.' });
    }

    return send(res, 200, {
      authorization_url: data.data.authorization_url,
      reference: data.data.reference || reference,
    });
  } catch (err) {
    console.error('[atelier-paystack-init]', err);
    return send(res, 502, { error: 'Could not connect to Paystack. Please try again.' });
  }
};
