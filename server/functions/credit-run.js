const {admin,getUser,json}=require('./_supabase');
const pricing=require('./_credit-policy');
const {getPrice}=require('./_wave-price');
const uuid=s=>/^[0-9a-f-]{36}$/i.test(s||'');
exports.handler=async event=>{
 if(!pricing.enabled())return json(503,{error:'New pricing is being prepared.'});
 if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
 try{
 const user=await getUser(event);if(!user)return json(401,{error:'Please sign in.'});
 const b=JSON.parse(event.body||'{}');if(!uuid(b.quote_id)||!uuid(b.request_key))return json(400,{error:'Request a fresh quote.'});
 const db=admin();const found=await db.from('fuse_credit_quotes').select('*').eq('id',b.quote_id).eq('user_id',user.id).single();if(found.error||!found.data)return json(404,{error:'Quote not found'});
 const q=found.data,plan=q.recipe;
 const old=await db.from('fuse_credit_executions').select('*').eq('quote_id',q.id).eq('user_id',user.id).maybeSingle();if(old.error)throw old.error;if(old.data)return json(old.data.response?200:202,old.data.response||{pending:true,execution_id:old.data.id,message:'This request is already processing. Do not submit it again.'});
 if(Date.parse(q.expires_at)<=Date.now())return json(409,{error:'Quote expired. Please review a new quote.',code:'QUOTE_EXPIRED'});
 const current=await getPrice(plan.model,plan.inputs);if(current.usd>q.pricing.provider_usd+1e-9)return json(409,{error:'Provider price changed. Please review a new quote.',code:'QUOTE_EXPIRED'});
 const reserve=await db.rpc('fuse_credit_reserve',{p_user:user.id,p_quote:q.id,p_key:b.request_key});if(reserve.error)return json(/NO_CREDITS/.test(reserve.error.message)?402:409,{error:/NO_CREDITS/.test(reserve.error.message)?'Not enough credits.':'Please refresh your price quote.'});
 const {execution,balance,reused}=reserve.data;if(reused)return json(execution.response?200:202,execution.response||{pending:true,execution_id:execution.id});
 const attempts=await db.from('fuse_credit_attempts').select('*').eq('execution_id',execution.id).order('ordinal');if(attempts.error)throw attempts.error;
 const ids=[];let review=false,refunded=0;
 for(const a of attempts.data){
  const mark=await db.from('fuse_credit_attempts').update({status:'submitting'}).eq('id',a.id).eq('status','prepared').select('id').single();if(mark.error){review=true;continue}
  try{
   const r=await fetch('https://api.wavespeed.ai/api/v3/'+plan.model,{method:'POST',headers:{Authorization:'Bearer '+(process.env.WAVESPEED_KEY||process.env.WAVESPEED_API_KEY),'Content-Type':'application/json'},body:JSON.stringify(plan.inputs),signal:AbortSignal.timeout(30000)});
   const j=await r.json().catch(()=>null);
   if(!r.ok){if(r.status>=400&&r.status<500){await db.from('fuse_credit_attempts').update({status:'rejected'}).eq('id',a.id);const refund=await db.rpc('fuse_credit_refund',{p_attempt:a.id});if(!refund.error)refunded+=a.credits;else review=true;continue}throw Error('Ambiguous provider response')}
   const id=j?.data?.id;if(!id)throw Error('Missing provider ID');const requestId='ws:'+id;
   const saved=await db.from('fuse_credit_attempts').update({status:'processing',provider_id:requestId}).eq('id',a.id);if(saved.error)throw saved.error;
   const job=await db.from('jobs').insert({request_id:requestId,user_id:user.id,kind:plan.kind,model:plan.internalModel,prompt:plan.prompt,aspect:plan.aspect,credits:a.credits,status:'processing'});if(job.error)throw job.error;ids.push(requestId);
  }catch{review=true;await db.from('fuse_credit_attempts').update({status:'review'}).eq('id',a.id);}
 }
 const result={request_ids:ids,request_id:ids[0]||null,execution_id:execution.id,credits:balance+refunded,charged:q.pricing.credits*plan.count-refunded,refunded,review_required:review,...(!ids.length?{error:review?'Your request needs a status check. Do not submit it again; contact support with the request ID.':'The provider could not start this request. Your credits were returned.'}:{})};
 const saved=await db.from('fuse_credit_executions').update({status:review?'review':ids.length?'processing':'failed',response:result}).eq('id',execution.id);if(saved.error)return json(202,{pending:true,execution_id:execution.id});
 return json(ids.length?200:review?202:502,result);
 }catch{return json(503,{error:'Could not confirm the request status. Check your Library before retrying.'})}
};
