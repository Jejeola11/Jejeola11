'use strict';
const {randomUUID}=require('crypto');
const {admin,getUser,json}=require('./_supabase');
const hf=require('./_higgsfield-seedance');
async function refund(db,job,message){
 const r=await db.rpc('higgsfield_fail_job',{p_request_id:job.request_id,p_message:message});
 if(r.error)throw r.error;return r.data===true;
}
async function run(event,provided){
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 const user=await getUser(event);if(!user)return json(401,{error:'Please sign in to create.'});
 let body;try{body=provided||JSON.parse(event.body||'{}');if((event.body||'').length>60000)throw Error()}catch{return json(400,{error:'Invalid Seedance request.'});}
 try{
  const m=hf.find(body.model);if(!m)return json(400,{error:'Choose a supported Higgsfield Seedance model.'});
  if(!hf.key())return json(503,{error:'Seedance connection is not configured.'});
  const priced=await hf.quote(m,body.inputs,{validate:body.quote!==true,userId:user.id});
  if(body.quote===true)return json(200,{credits:priced.credits,model:m.model_id,provider:'higgsfield'});
  if(body.accepted_credits!==priced.credits)return json(409,{error:'Review the updated credit quote before generating.',credits:priced.credits});
  const nonce=body.client_request_id||randomUUID();if(!/^[a-zA-Z0-9-]{8,80}$/.test(nonce))return json(400,{error:'Invalid generation reference.'});
  // Persist a user-scoped submission before spending or calling the provider.
  const request_id='hf:'+user.id+':'+nonce,db=admin();
  let job={request_id,user_id:user.id,kind:'video',model:m.model_id,prompt:String(priced.inputs.prompt||'').slice(0,8000),aspect:priced.inputs.aspect_ratio||'16:9',credits:0,status:'processing',meta:{provider:'higgsfield',submitting:true,provider_usd_quote:priced.provider_usd,pricing_source:'wavespeed',pricing_version:priced.pricing_version,wavespeed_usd:priced.wavespeed_usd}};
  const saved=await db.from('jobs').insert(job);
  if(saved.error){if(saved.error.code==='23505'){const prior=await db.from('jobs').select('*').eq('request_id',request_id).eq('user_id',user.id).maybeSingle();if(prior.data)return json(200,{request_id,charged:prior.data.credits,provider:'higgsfield'});}throw Error('Could not save this generation. No request was sent.');}
  const spend=await db.rpc('higgsfield_reserve_job',{p_request_id:request_id,p_user_id:user.id,p_credits:priced.credits});
  if(spend.error)return json(200,{request_id,warning:'Your credit reservation is being checked. Do not submit again.'});
  if(spend.data===null){await db.from('jobs').update({status:'failed',error_message:'Credits could not be reserved. No generation was started.'}).eq('request_id',request_id);return json(spend.data===null&&!spend.error?402:500,{error:spend.error?'Could not reserve your credits.':'Not enough credits. Please top up.'});}
  job.credits=priced.credits;
  const current=await db.from('jobs').select('*').eq('request_id',request_id).maybeSingle();
  if(current.error||!current.data)return json(200,{request_id,charged:priced.credits,warning:'Your reservation is saved. Support is checking its status.'});
  job=current.data;
  try{
   const providerId=await hf.submit(m.model_id,priced.inputs);
   const result=await db.from('jobs').update({meta:{...job.meta,submitting:false,higgsfield_request_id:providerId}}).eq('request_id',request_id);
   if(result.error){console.error('[higgsfield persistence]',request_id,providerId);return json(200,{request_id,charged:priced.credits,warning:'Your generation was submitted. Support is checking its saved status.'});}
   return json(200,{request_id,charged:priced.credits,credits:spend.data,provider:'higgsfield'});
  }catch(e){
   if(e.uncertain){await db.from('jobs').update({meta:{...job.meta,submitting:false,submission_unknown:true},error_message:'Provider submission needs reconciliation. Do not resubmit.'}).eq('request_id',request_id);return json(200,{request_id,charged:priced.credits,warning:'Submission is being checked. Do not submit again.'});}
   const returned=await refund(db,job,e.message);return json(502,{error:e.message,refunded:returned?priced.credits:0});
  }
 }catch(e){return json(400,{error:String(e.message||'Could not prepare Seedance.').slice(0,400)});}
}
async function status(db,user,job){
 if(job.status==='generating')return json(200,{status:'processing'});
 if(!job.meta?.higgsfield_request_id)return json(200,{status:'processing',message:job.meta?.submission_unknown?'Submission is being checked. Do not resubmit.':'Submitting to Seedance…'});
 let result;try{result=await hf.poll(job.meta.higgsfield_request_id);}catch{return json(200,{status:'processing'});}
 if(result.status==='failed'){const returned=await refund(db,job,result.error);return json(200,{status:'failed',error:result.error+(returned?' Your Fuse credits have been returned.':' Please contact support about your credit return.')});}
 if(result.status!=='completed')return json(200,{status:'processing'});
 const claim=await db.from('jobs').update({status:'generating'}).eq('request_id',job.request_id).eq('status','processing').select().maybeSingle();
 if(claim.error||!claim.data)return json(200,{status:'processing'});
 try{
  const url=await require('./_video-archive').archiveVideo(db,user.id,result.url,job.request_id);
  const done=await db.from('jobs').update({status:'completed',output_url:url}).eq('request_id',job.request_id);if(done.error)throw done.error;
  await db.from('generations').insert({user_id:user.id,type:'video',model:job.model,prompt:job.prompt,aspect:job.aspect,output_url:url,credits_spent:job.credits});
  return json(200,{status:'completed',url});
 }catch{await db.from('jobs').update({status:'processing'}).eq('request_id',job.request_id).eq('status','generating');return json(200,{status:'processing'});}
}
module.exports={run,status};
