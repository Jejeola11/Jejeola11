'use strict';
const {admin,getUser,json}=require('./_supabase');
const wave=require('./_wavespeed-catalogue');
exports.handler=async event=>{
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 const user=await getUser(event);if(!user)return json(401,{error:'Please sign in to create.'});
 let body;try{body=JSON.parse(event.body||'{}');if((event.body||'').length>60000)throw Error()}catch{return json(400,{error:'Invalid model request'})}
 try{
  const m=(await wave.catalogue()).find(m=>m.model_id===body.model);if(!m)return json(400,{error:'Choose a supported image or video model.'});
  const priced=await wave.quote(m,body.inputs,{validate:body.quote!==true});
  if(body.quote===true)return json(200,{credits:priced.credits,model:m.model_id});
  if(body.accepted_credits!==priced.credits)return json(409,{error:'Review the updated credit quote before generating.',credits:priced.credits});
  const db=admin();const spend=await db.rpc('spend_credits',{uid:user.id,amount:priced.credits});if(spend.error)throw spend.error;if(spend.data===null)return json(402,{error:'Not enough credits. Please top up.'});
  let started=false;
  try{
   const r=await fetch('https://api.wavespeed.ai/api/v3/'+m.model_id,{method:'POST',headers:{Authorization:'Bearer '+wave.apiKey(),'Content-Type':'application/json'},body:JSON.stringify(priced.inputs),signal:AbortSignal.timeout(35000)});
   const out=await r.json().catch(()=>({}));if(!r.ok||!out.data?.id)throw Error(out.message||'The provider could not start this generation.');
   started=true;const request_id='ws:'+out.data.id;
   const record=await db.from('jobs').insert({request_id,user_id:user.id,kind:m.type.includes('video')||['digital-human','motion-control'].includes(m.type)?'video':'image',model:m.model_id,prompt:String(priced.inputs.prompt||'').slice(0,8000),aspect:priced.inputs.aspect_ratio||'9:16',credits:priced.credits,status:'processing'});
   if(record.error){console.error('[wavespeed job persistence]',request_id);return json(500,{error:'Generation started but could not be saved. Contact support with '+request_id,request_id});}
   return json(200,{request_id,charged:priced.credits,credits:spend.data});
  }catch(e){if(!started)await db.rpc('add_credits',{uid:user.id,amount:priced.credits,why:'refund'});throw e}
 }catch(e){return json(400,{error:String(e.message||'Could not complete this generation.').slice(0,500)})}
};
