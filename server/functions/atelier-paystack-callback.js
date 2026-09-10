// Verifies Paystack before redirecting the buyer to the current WhatsApp number.
const PRICE_KOBO = 1500000;
const WHATSAPP_NUMBER = '2349044558101';

const redirect = (url) => ({
  statusCode: 302,
  headers: { Location: url, 'Cache-Control': 'no-store' },
  body: '',
});

exports.handler = async (event) => {
  const secret = (process.env.PAYSTACK_SECRET_KEY || '').trim();
  const query = event.queryStringParameters || {};
  const ref = String(query.reference || query.trxref || '').trim();

  if (!secret || !ref) {
    return redirect('https://fuse-atelier.vercel.app/atelier?payment=not_verified');
  }

  try {
    const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(ref)}`, {
      headers: { Authorization: `Bearer ${secret}` },
    });
    const body = await response.json();
    const tx = body && body.data;
    const valid = !!(
      response.ok && body.status && tx && tx.status === 'success' &&
      tx.currency === 'NGN' && Number(tx.amount) === PRICE_KOBO
    );

    if (!valid) return redirect('https://fuse-atelier.vercel.app/atelier?payment=failed');

    const message =
      'Hi Ria! I just paid ₦15,000 for Fuse Atelier Founding Access on Paystack. ' +
      'My payment reference is ' + ref + '. Please send me my access details.';
    return redirect(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
  } catch (error) {
    return redirect('https://fuse-atelier.vercel.app/atelier?payment=verify_error');
  }
};
