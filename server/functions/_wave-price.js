'use strict';
async function getPrice(model,inputs,fetcher=fetch){
 const key=(process.env.WAVESPEED_KEY||process.env.WAVESPEED_API_KEY||'').trim();if(!key)throw Error('WaveSpeed pricing is not connected');
 const r=await fetcher('https://api.wavespeed.ai/api/v3/model/price',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model_id:model,inputs}),signal:AbortSignal.timeout(15000)});
 const j=await r.json();const d=j.data;
 if(!r.ok||j.code!==200||!d||d.model_id!==model||d.currency!=='USD'||typeof d.price!=='number'||!Number.isFinite(d.price)||d.price<0)throw Error('A reliable price is unavailable. No generation was started.');
 // Price against list cost. Temporary provider discounts stay as additional margin.
 return {usd:d.price,discounted_usd:typeof d.discounted_price==='number'?d.discounted_price:null,checked_at:new Date().toISOString()};
}
module.exports={getPrice};
