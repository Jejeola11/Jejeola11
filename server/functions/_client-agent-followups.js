'use strict';
const conversation=require('./_client-agent-conversation');
const eligible=p=>p&&['asked','sample_sent','proposal_sent'].includes(p.status);
async function processOne(db){
 const claimed=await db.rpc('client_agent_claim_followup');if(claimed.error)throw claimed.error;
 const task=claimed.data?.[0];if(!task)return false;
 const save=async patch=>{const r=await db.from('client_agent_followups').update(patch).eq('id',task.id).eq('lease_token',task.lease_token);if(r.error)throw r.error};
 try{
  const result=await db.from('client_prospects').select('*').eq('id',task.prospect_id).eq('user_id',task.user_id).single();if(result.error)throw result.error;
  const p=result.data;
  if(!eligible(p)||Date.parse(p.last_contacted_at)!==Date.parse(task.contact_at)){await save({status:'cancelled',lease_token:null,lease_until:null});return true}
  let draft=task.draft;
  if(!draft){
   const profile=await db.from('client_agent_profiles').select('profile_json').eq('user_id',task.user_id).maybeSingle();if(profile.error)throw profile.error;
   draft=await conversation.draft(p,profile.data?.profile_json||p.qualification_json?.approved_offer,p.conversation_json||[],'followup');
   if(draft.stop){await save({status:'cancelled',lease_token:null,lease_until:null});return true}
   await save({draft});
  }
  const account=await db.auth.admin.getUserById(task.user_id);if(account.error)throw account.error;
  const recipient=account.data?.user?.email;if(!recipient)throw Error('Account email unavailable');
  if(!process.env.RESEND_API_KEY||!process.env.FUSE_EMAIL_FROM)throw Error('Reminder email is not configured');
  // Check cancellation again immediately before notifying the account owner.
  const current=await db.from('client_agent_followups').select('status,lease_token').eq('id',task.id).single();if(current.error)throw current.error;
  if(current.data.status!=='working'||current.data.lease_token!==task.lease_token)return true;
  const link='https://fuseatelier.com/atelier-v2/clients.html?prospect='+encodeURIComponent(p.id)+'&tab=track';
  const text=`Your follow-up with ${p.brand_name} is due.\n\nReview their latest response before sending. This message has NOT been sent to the brand.\n\nSubject: ${draft.subject}\n\n${draft.email}\n\nShort DM:\n${draft.dm}\n\nNext step: ${draft.next_step}\n\nOpen your prospect and record what you sent, paste a reply, or stop reminders:\n${link}\n\nFuse only knows replies you paste into your workspace; it is not reading your email or social inbox.`;
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'fuse-agent-followup/'+task.id},body:JSON.stringify({from:process.env.FUSE_EMAIL_FROM,to:[recipient],subject:'Follow up with '+p.brand_name,text}),signal:AbortSignal.timeout(12000)});
  const delivery=await response.json().catch(()=>({}));if(!response.ok)throw Error('Reminder delivery failed ('+response.status+')');
  await save({status:'delivered',sent_at:new Date().toISOString(),provider_id:delivery.id||null,lease_token:null,lease_until:null,last_error:null});
  return true;
 }catch(error){
  await save({status:task.attempts>=4?'failed':'pending',lease_token:null,lease_until:null,next_attempt_at:new Date(Date.now()+15*60000).toISOString(),last_error:String(error.message).slice(0,250)});
  console.warn('[agent reminder]',task.id,error.message);return true;
 }
}
module.exports={processOne,eligible};
