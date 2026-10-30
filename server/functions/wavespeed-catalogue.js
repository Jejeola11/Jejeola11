'use strict';
const {json}=require('./_supabase');
let cached=null,expires=0;
exports.handler=async event=>{
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 try{
 if(!cached||expires<Date.now()){
 const key=process.env.WAVESPEED_KEY||process.env.WAVESPEED_API_KEY;if(!key)return json(503,{error:'Model catalogue unavailable'});
 const r=await fetch('https://api.wavespeed.ai/api/v3/models',{headers:{Authorization:'Bearer '+key},signal:AbortSignal.timeout(20000)});
 if(!r.ok)return json(503,{error:'Model catalogue unavailable'});
 const data=await r.json();cached=data;expires=Date.now()+3600000;
 }
 const out=json(200,cached);out.headers['Cache-Control']='public, s-maxage=3600, stale-while-revalidate=86400';return out;
 }catch{return json(503,{error:'Model catalogue unavailable'})}
};
