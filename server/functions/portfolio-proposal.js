const { createHash } = require('node:crypto');

const recipient = 'maryamjejeola002@gmail.com';
const allowedOrigins = new Set([
  'https://fuseatelier.com',
  'https://www.fuseatelier.com',
  'https://fuse-atelier.vercel.app'
]);
const fieldLimits = { name: 100, email: 150, phone: 40, message: 2500 };

function json(statusCode, data) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    body: JSON.stringify(data)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Use the proposal form to submit.' });
  const origin = event.headers?.origin ?? event.headers?.Origin;
  if (origin && !allowedOrigins.has(origin)) return json(403, { error: 'Submit from the portfolio page.' });
  if (!event.body || Buffer.byteLength(event.body) > 12000) return json(400, { error: 'Check your proposal fields.' });

  let proposal;
  try {
    proposal = JSON.parse(event.body);
  } catch {
    return json(400, { error: 'Check your proposal fields.' });
  }
  if (!proposal || proposal.website || !/^[a-f0-9-]{36}$/i.test(proposal.requestId || '')) {
    return json(400, { error: 'Refresh the page and try again.' });
  }
  for (const [field, max] of Object.entries(fieldLimits)) {
    const value = proposal[field] ?? '';
    if (typeof value !== 'string' || value.length > max) return json(400, { error: 'Check your proposal fields.' });
    proposal[field] = value.trim();
  }
  const { name, email, phone, message, requestId } = proposal;
  if (!name || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(400, { error: 'Enter your first name, a valid email address, and a message.' });
  }
  if (!process.env.RESEND_API_KEY || !process.env.FUSE_EMAIL_FROM) {
    console.error('[Portfolio proposal] Missing email configuration');
    return json(503, { error: 'Proposal delivery is temporarily unavailable. Please try again shortly.' });
  }

  const key = createHash('sha256').update(JSON.stringify([requestId, name, email, phone, message])).digest('hex');
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `portfolio-proposal/${key}`
      },
      body: JSON.stringify({
        from: process.env.FUSE_EMAIL_FROM,
        to: [recipient],
        reply_to: email,
        subject: 'New modest fashion project proposal',
        text: `First name: ${name}\nEmail: ${email}\nPhone: ${phone || 'Not provided'}\n\n${message}`
      }),
      signal: AbortSignal.timeout(12000)
    });
    const result = await response.json();
    if (response.ok && result.id) return json(200, { success: true });
    console.error('[Portfolio proposal] Email provider response', response.status);
  } catch (error) {
    console.error('[Portfolio proposal] Email request failed', error.name);
  }
  return json(502, { error: 'Your proposal could not be sent. Please try again.' });
};
