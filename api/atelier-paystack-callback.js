// Verifies the Paystack transaction before sending a buyer to WhatsApp.
const PRICE_KOBO = 1500000;
const WHATSAPP_NUMBER = '2349044558101';

function redirect(res, url) {
  res.statusCode = 302;
  res.setHeader('location', url);
  res.setHeader('cache-control', 'no-store');
  res.end();
}

module.exports = async function handler(req, res) {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  const ref = String((req.query && (req.query.reference || req.query.trxref)) || '').trim();

  if (!secret || !ref) {
    return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=not_verified');
  }

  try {
    const response = await fetch('https://api.paystack.co/transaction/verify/' + encodeURIComponent(ref), {
      headers: { Authorization: 'Bearer ' + secret }
    });
    const body = await response.json();
    const tx = body && body.data;

    const valid = !!(
      response.ok &&
      body.status &&
      tx &&
      tx.status === 'success' &&
      tx.currency === 'NGN' &&
      Number(tx.amount) === PRICE_KOBO
    );

    if (!valid) {
      return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=failed');
    }

    const message =
      'Hi Ria! I just paid ₦15,000 for Fuse Atelier Founding Access on Paystack. ' +
      'My payment reference is ' + ref + '. Please send me my access details.';
    const wa = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
    return redirect(res, wa);
  } catch (err) {
    return redirect(res, 'https://fuse-atelier.vercel.app/atelier?payment=verify_error');
  }
};
