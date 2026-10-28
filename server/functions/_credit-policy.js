'use strict';
const VERSION='2026-10-credit-v2';
const PACKS=Object.freeze({
 'credits-v2-trial':{label:'Try Fuse',amount_naira:1000,credits:4,kind:'pack',note:'A small start for your first creations'},
 'credits-v2-mini':{label:'Mini',amount_naira:5000,credits:45,kind:'pack',note:'Room to explore your creative ideas'},
 'credits-v2-creator':{label:'Creator',amount_naira:10000,credits:100,kind:'pack',note:'For your next creative project'},
 'credits-v2-studio':{label:'Studio',amount_naira:20000,credits:200,kind:'pack',note:'For regular creative work'},
 'credits-v2-pro':{label:'Pro',amount_naira:50000,credits:500,kind:'pack',note:'For busy production schedules'},
 'credits-v2-agency':{label:'Agency',amount_naira:100000,credits:1000,kind:'pack',note:'For larger client projects'}
});
function enabled(){return process.env.FUSE_PRICING_V2==='1'}
function policy(){const fx=Number(process.env.FUSE_FX_BUDGET_NGN||1700);if(!Number.isFinite(fx)||fx<1)throw Error('Pricing exchange rate unavailable');return {fx,fees:.15,operations:.10,target:.40,retries:.10,minCredits:2};}
function quote(usd,unitValue=100){const p=policy();if(!Number.isFinite(usd)||usd<0||!Number.isFinite(unitValue)||unitValue<=0)throw Error('Invalid cost quote');const unit=Math.min(unitValue,100);const provider=usd*p.fx;const credits=Math.max(p.minCredits,Math.ceil((provider*(1+p.retries))/(unit*(1-p.fees-p.operations-p.target))-1e-9));const revenue=credits*unit;return {version:VERSION,credits,provider_usd:usd,fx:p.fx,unit_value_ngn:unit,attributed_revenue_ngn:revenue,provider_ngn:provider,fee_reserve_ngn:revenue*p.fees,operating_reserve_ngn:revenue*p.operations,retry_reserve_ngn:provider*p.retries,contribution_ngn:revenue*(1-p.fees-p.operations)-provider*(1+p.retries)};}
function checkout(id){let links;try{links=JSON.parse(process.env.FUSE_NESTUGE_CREDIT_LINKS||'{}')}catch{return null}try{const u=new URL(links[id]);return u.protocol==='https:'&&(u.hostname==='nestuge.com'||u.hostname.endsWith('.nestuge.com'))?u.href:null}catch{return null}}
module.exports={VERSION,PACKS,enabled,policy,quote,checkout};
