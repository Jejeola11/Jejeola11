// Server-owned price rules for the email-only AI Influencer course offer.
// This is an offer code (shareable), not evidence of subscription status.
const PACK = 'academy-influencer';
const CODE = 'EMAIL30';
const REGULAR_NAIRA = 9900;
const DISCOUNT_NAIRA = 6930;

function normalizeCode(value) {
  return typeof value === 'string' ? value.trim().toUpperCase() : '';
}
function hasValidCoupon(pack, code) {
  return pack === PACK && normalizeCode(code) === CODE;
}
function isDiscountedTransaction(pack, metadata, amountNaira) {
  return pack === PACK &&
    normalizeCode(metadata?.promo_code) === CODE &&
    Number(metadata?.amount_naira) === DISCOUNT_NAIRA &&
    amountNaira === DISCOUNT_NAIRA;
}
module.exports = { PACK, CODE, REGULAR_NAIRA, DISCOUNT_NAIRA, normalizeCode, hasValidCoupon, isDiscountedTransaction };
