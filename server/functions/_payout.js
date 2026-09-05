// ============================================================
// Automatic payout sweep — the moment a payment webhook confirms money has
// landed in the Paystack balance, push it straight out to the real bank
// account it should end up in, instead of waiting on Paystack's own
// settlement batch (T+1, and pushed further out over weekends/holidays).
// Paystack's Transfer API moves money over the same NIP interbank rails as
// any other Nigerian transfer, which run every day of the week — this is
// what actually delivers "lands in my account immediately, weekends
// included" rather than Paystack's own settlement schedule.
//
// ONE real-world step has to happen before this can run fully hands-off:
// ask Paystack support to disable OTP confirmation for transfers on this
// business (a manual request on their side, tied to identity verification).
// Until that's done, every transfer Paystack receives will just sit
// "pending OTP" and never complete on its own — see the troubleshooting
// note in the deploy guide. Nothing here breaks if that hasn't happened
// yet; the transfer call still succeeds (submits fine), it just won't
// finish moving money until OTP is disabled account-side.
//
// Sweeps the FULL amount received (per your own choice) — Paystack's
// transfer fee + the ₦50 stamp duty (transfers ≥ ₦10,000) come out of your
// overall Paystack balance separately, not out of this specific transfer.
// ============================================================
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
