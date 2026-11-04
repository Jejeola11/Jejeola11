'use strict';
// Locked retail assumptions. Re-review before increasing discounts, commissions,
// payment fees or USD exposure. Free/historical credits are acquisition costs.
const VERSION='fuse-credit-policy-2026-11-04';
const POLICY=Object.freeze({usdNaira:1500,minimumRetailNaira:1250/15,maxDiscount:.25,affiliateRate:.05,paymentRate:.02,paymentFixedNaira:100,smallestPackCredits:15,minimumContributionMargin:.10});
const netNairaPerCredit=POLICY.minimumRetailNaira*(1-POLICY.maxDiscount)*(1-POLICY.affiliateRate-POLICY.paymentRate)-POLICY.paymentFixedNaira/POLICY.smallestPackCredits;
function credits(usd){
 if(!Number.isFinite(usd)||usd<=0)throw Error('A verified provider price is required.');
 const floor=Math.ceil(usd*POLICY.usdNaira/(netNairaPerCredit*(1-POLICY.minimumContributionMargin))-1e-12);
 const previous=Math.ceil(usd*1400*2/85-1e-12);
 const result=Math.max(1,previous,floor);
 if(!Number.isSafeInteger(result))throw Error('Provider quote exceeds supported pricing.');
 return result;
}
function assertPack(pack,amount=pack.amount_naira){
 if(!Number.isFinite(amount)||amount<=0||!Number.isSafeInteger(pack.credits)||pack.credits<=0)throw Error('Invalid credit pack.');
 const net=(amount*(1-POLICY.affiliateRate-POLICY.paymentRate)-POLICY.paymentFixedNaira)/pack.credits;
 if(net+1e-9<netNairaPerCredit)throw Error('This credit offer requires a pricing review.');
}
module.exports=Object.freeze({VERSION,POLICY,netNairaPerCredit,credits,assertPack});
