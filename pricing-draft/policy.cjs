// Draft only. Not connected to checkout or generation until provider quotes are verified.
const policy={nairaPerCredit:100,fxBudget:1700,feeReserve:0.15,operatingReserve:0.10,retryReserve:0.10,targetContribution:0.40,minimumCredits:2};
function quote(usd,p=policy){
 if(!Number.isFinite(usd)||usd<0)throw new Error('A verified nonnegative provider quote is required');
 const provider=usd*p.fxBudget,risk=provider*p.retryReserve;
 const available=1-p.feeReserve-p.operatingReserve-p.targetContribution;
 if(available<=0)throw new Error('Invalid margin policy');
 const credits=Math.max(p.minimumCredits,Math.ceil((provider+risk)/available/p.nairaPerCredit));
 const retail=credits*p.nairaPerCredit,fees=retail*p.feeReserve,operations=retail*p.operatingReserve;
 return {credits,retail,provider,fees,operations,risk,contribution:retail-provider-fees-operations-risk};
}
module.exports={policy,quote};
