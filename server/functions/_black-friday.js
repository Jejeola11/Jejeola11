const PACK = 'black-friday-creator-bundle';
const AMOUNT = 15000;
const REQUIRED_SIGNUPS = 5;
const CAMPAIGN_CLOSE = Date.parse('2026-11-21T16:10:00Z');
const CAMPAIGN_START = '2026-11-19T15:38:00Z';

async function countSignups(db, userId) {
  const { count, error } = await db.from('fuse_referrals')
    .select('referred_user_id', { count: 'exact', head: true })
    .eq('referrer_user_id', userId)
    .gte('signed_up_at', CAMPAIGN_START);
  if (error) throw error;
  return count || 0;
}

function validTransaction(tx) {
  return tx.currency === 'NGN' && tx.amount === AMOUNT * 100 &&
    Number(tx.metadata?.amount_naira) === AMOUNT;
}

function fulfill(db, userId, reference, tx) {
  return db.rpc('fulfill_black_friday_bundle', {
    p_user_id: userId,
    p_reference: reference,
    p_amount_naira: AMOUNT,
    p_raw: tx
  });
}

module.exports = { CAMPAIGN_CLOSE, PACK, AMOUNT, REQUIRED_SIGNUPS, countSignups, validTransaction, fulfill };
