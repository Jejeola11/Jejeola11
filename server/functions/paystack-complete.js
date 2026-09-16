// ============================================================
// GET /api/paystack-complete?reference=...
// Verified return path for one-time Fuse Atelier credit packs.
//
// Paystack redirects here after checkout. We verify the transaction directly
// with Paystack, validate the exact server-side pack/amount, then call the
// atomic Supabase fulfillment RPC. The Paystack webhook uses the same RPC,
// so callback + webhook retries can never double-credit a buyer.
// ============================================================
const { admin } = require('./_supabase');
const { PACKS, creditsForPack } = require('./_packs');

const redirect = (url) => ({
  statusCode: 302,
  headers: { Location: url, 'Cache-Control': 'no-store' },
  body: '',
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };

  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const forwardedHost = event.headers['x-forwarded-host'] || event.headers.host || '';
  const forwardedProto = event.headers['x-forwarded-proto'] || 'https';
  const appUrl = (forwardedHost ? `${forwardedProto}://${forwardedHost}` : (process.env.APP_URL || 'https://fuse-atelier.vercel.app')).replace(/\/+$/, '');
  const q = event.queryStringParameters || {};
  const reference = String(q.reference || q.trxref || '').trim();

  if (!secret || !reference) {
    return redirect(`${appUrl}/atelier-v2/pricing.html?payment=verify_error`);
  }

  try {
    const response = await fetch(
      'https://api.paystack.co/transaction/verify/' + encodeURIComponent(reference),
      { headers: { Authorization: 'Bearer ' + secret } }
    );
    const body = await response.json();
    const d = body && body.data;
    const meta = (d && d.metadata) || {};
    const packKey = String(meta.pack || '').trim();
    const userId = String(meta.user_id || '').trim();
    const pack = PACKS[packKey];

    if (!response.ok || !body.status || !d || d.status !== 'success' || !pack || pack.kind !== 'pack' || !userId) {
      return redirect(`${appUrl}/atelier-v2/pricing.html?payment=failed`);
    }

    const amountNaira = Math.round(Number(d.amount || 0) / 100);
    const validAmount = d.currency === 'NGN' && amountNaira === pack.amount_naira;
    if (!validAmount) {
      console.error('[paystack-complete] amount mismatch', reference, packKey, d.amount, d.currency);
      return redirect(`${appUrl}/atelier-v2/pricing.html?payment=amount_mismatch`);
    }

    const credits = creditsForPack(packKey, pack.credits);
    const db = admin();
    const { data, error } = await db.rpc('fulfill_credit_pack_purchase', {
      p_user_id: userId,
      p_reference: reference,
      p_amount_naira: amountNaira,
      p_pack: packKey,
      p_credits: credits,
      p_raw: d,
    });

    if (error) throw error;

    const row = Array.isArray(data) ? data[0] : data;
    const balance = row && row.balance != null ? row.balance : '';
    const qs = new URLSearchParams({
      payment: 'success',
      pack: packKey,
      credits: String(credits),
      ...(balance !== '' ? { balance: String(balance) } : {}),
    });

    return redirect(`${appUrl}/atelier-v2/pricing.html?${qs.toString()}`);
  } catch (err) {
    console.error('[paystack-complete]', err && err.message);
    return redirect(`${appUrl}/atelier-v2/pricing.html?payment=verify_error`);
  }
};
