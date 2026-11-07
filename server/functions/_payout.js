// Automatic third-party transfers require a Paystack Registered Business.
// Starter businesses can collect customer payments but are not permitted to
// initiate third-party payouts. Ordinary Paystack bank settlements continue.
// Keep transfers disabled unless the merchant explicitly enables this flag
// after Paystack confirms Registered Business transfer access.
const PAYSTACK_BASE = 'https://api.paystack.co';

// Your real settlement account — same one already shown to customers as
// the manual-payment fallback in app/config.js's PAYMENT.bank.
const DESTINATION = {
  bank_code: '999992', // OPay Digital Services Limited — Paystack/NIBSS code
  account_number: '9127651634',
  name: 'Maryam Jejeola Owoyale',
};

async function paystackFetch(path, opts) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, 'Content-Type': 'application/json', ...((opts && opts.headers) || {}) },
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.status === false) throw new Error((j && j.message) || `Paystack HTTP ${res.status}`);
  return j;
}

// Creates the transfer recipient once, then reuses it forever (cached in
// platform_kv — see schema-phase22.sql) rather than re-registering your own
// bank account with Paystack on every single payment.
async function ensureRecipient(db) {
  const { data: cached } = await db.from('platform_kv').select('value').eq('key', 'payout_recipient_code').maybeSingle();
  if (cached && cached.value) return cached.value;

  const j = await paystackFetch('/transferrecipient', {
    method: 'POST',
    body: JSON.stringify({
      type: 'nuban',
      name: DESTINATION.name,
      account_number: DESTINATION.account_number,
      bank_code: DESTINATION.bank_code,
      currency: 'NGN',
    }),
  });
  const code = j.data && j.data.recipient_code;
  if (!code) throw new Error('Paystack did not return a recipient_code');
  await db.from('platform_kv').upsert({ key: 'payout_recipient_code', value: code, updated_at: new Date().toISOString() });
  return code;
}

// amountNaira: whole-naira amount to sweep out — the webhook already
// derives this from Paystack's kobo `amount` field for the same payment.
async function sweepToBank(db, amountNaira, reference) {
  if (process.env.PAYSTACK_AUTO_SWEEP !== 'true') return;
  if (!process.env.PAYSTACK_SECRET_KEY) return;
  if (!amountNaira || amountNaira < 1) return;
  const recipientCode = await ensureRecipient(db);
  await paystackFetch('/transfer', {
    method: 'POST',
    body: JSON.stringify({
      source: 'balance',
      amount: Math.round(amountNaira * 100),
      recipient: recipientCode,
      reason: `Fuse Studio payout — ${reference}`,
      reference: `payout-${reference}`,
    }),
  });
}

module.exports = { sweepToBank };
