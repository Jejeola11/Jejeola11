'use strict';
const {json,getPlan}=require('./_supabase');
const openai=require('./_openai-direct');
async function status(db,user,job){
 const text=job.request_id.startsWith('oa-text:');
 if(job.status==='completed')return json(200,{status:'completed',...(text?{text:job.output_text}:{url:job.output_url})});
 if(job.status==='failed')return json(200,{status:'failed',error:job.error_message});
 if(job.status==='generating')return json(200,{status:'processing'});
 let r;try{r=text?await openai.pollText(job.request_id.slice(8)):await openai.poll(job.request_id.slice(3),{db,userId:user.id,model:job.model});}catch{return json(200,{status:'processing'});}
 if(r.status==='processing')return json(200,{status:'processing'});
 // Only one overlapping browser poll may finalize, refund or file the result.
 const claim=await db.from('jobs').update({status:'generating'}).eq('request_id',job.request_id).eq('status','processing').select().maybeSingle();
 if(claim.error||!claim.data)return json(200,{status:'processing'});
 if(r.status==='failed'){
  const message=r.raw?.error||'OpenAI could not complete this generation.';
  const saved=await db.from('jobs').update({status:'failed',error_message:message,output_text:message}).eq('request_id',job.request_id);
  if(!saved.error){try{const plan=await getPlan(user.id);if(!plan.isAdmin&&job.credits)await db.rpc('add_credits',{uid:user.id,amount:job.credits,why:'refund'});}catch{}}
  return json(200,{status:'failed',error:message});
 }
 const done=await db.from('jobs').update({status:'completed',...(text?{output_text:r.text}:{output_url:r.url}),meta:{...job.meta,provider:'openai',openai_usage:r.usage,openai_image_usage:r.image_usage||null,truncated:!!r.truncated,provider_cost_usd:r.cost_usd??null,cost_verified:Number.isFinite(r.cost_usd),cost_exceeded_quote:Number.isFinite(r.cost_usd)&&Number.isFinite(job.meta?.provider_usd_quote)?r.cost_usd>job.meta.provider_usd_quote:null}}).eq('request_id',job.request_id);
 if(done.error){await db.from('jobs').update({status:'processing'}).eq('request_id',job.request_id).eq('status','generating');return json(200,{status:'processing'});}
 if(!text)await db.from('generations').insert({user_id:user.id,type:'image',model:job.model,prompt:job.prompt,aspect:job.aspect,output_url:r.url,credits_spent:job.credits,...(Number.isFinite(r.cost_usd)?{cost_usd:r.cost_usd}:{})});
 return json(200,{status:'completed',...(text?{text:r.text}:{url:r.url})});
}
module.exports={status};

