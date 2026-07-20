// ============================================================
// POST /.netlify/functions/freelance-invoice   (owner/admin only)
// Body: { client_name, client_email?, amount_naira, description? }
// Creates a standalone Paystack checkout link for a one-off freelance
// client (Sandeep, Michael, etc.) — completely separate from Fuse
// Studio's own pack/course purchases (see paystack-init.js). The client
// never needs a Fuse Studio account; the returned authorization_url is
// just a normal Paystack checkout page.
//
// Fulfilment on payment is handled in paystack-webhook.js's
// `meta.kind === 'freelance'` branch: no credits, no course unlock, no
// user account touched — just records the payment and sweeps it straight
// to your bank the same way every other Fuse Studio payment already does
// (see _payout.js), so this gets you the same same-day, zero-extra-fee
// payout Fuse Studio's own checkout gets, without needing Paystack's
// separate 1%-fee "Payout on Demand" button.
// ============================================================
const { getUser, json, admin } = require('./_supabase');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const user = await getUser(event);
    if (!user) return json(401, { error: 'Please sign in again.' });

    const db = admin();
    const { data: me } = await db.from('profiles').select('is_admin').eq('id', user.id).maybeSingle();
    if (!me || !me.is_admin) return json(403, { error: 'Admins only.' });

    let body; try { body = JSON.parse(event.body || '{}'); } catch (e) { return json(400, { error: 'Bad request' }); }
    const clientName = (body.client_name || '').trim();
    const clientEmail = (body.client_email || '').trim() || user.email; // Paystack requires SOME email; falls back to yours
    const amountNaira = parseInt(body.amount_naira, 10);
    const description = (body.description || '').trim() || `Invoice for ${clientName}`;
    if (!clientName) return json(400, { error: 'Enter the client\'s name.' });
    if (!amountNaira || amountNaira <= 0) return json(400, { error: 'Enter a valid amount.' });

    const appUrl = process.env.APP_URL || '';
    const reference = `freelance-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const res = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: clientEmail,
        amount: amountNaira * 100,
        currency: 'NGN',
        reference,
        channels: ['bank_transfer', 'card', 'bank', 'ussd'],
        callback_url: `${appUrl}/studio?paid=1&freelance=1`,
        metadata: {
          kind: 'freelance',
          admin_user_id: user.id,
          client_name: clientName,
          description,
          custom_fields: [
            { display_name: 'Client', variable_name: 'client', value: clientName },
            { display_name: 'For', variable_name: 'description', value: description },
          ],
        },
      }),
    });

    const data = await res.json();
    if (!data.status) return json(502, { error: data.message || 'Could not create invoice link.' });

    return json(200, { authorization_url: data.data.authorization_url, reference });
  } catch (e) {
    return json(500, { error: (e && e.message) || 'Could not create invoice.' });
  }
};
