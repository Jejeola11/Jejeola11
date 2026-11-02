'use strict';
const {getUser,getPlan,json}=require('./_supabase');
const hf=require('./_higgsfield-seedance');
exports.handler=async event=>{
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 const user=await getUser(event);if(!user)return json(401,{error:'Please sign in.'});
 const plan=await getPlan(user.id);if(!plan.isAdmin)return json(403,{error:'Admin access required.'});
 if(!hf.key())return json(200,{configured:false,authenticated:false});
 try{
  // Read-only probe: no generation or billable request is submitted.
  const r=await fetch('https://api.higgsfield.ai/requests/00000000-0000-4000-8000-000000000000/status',{headers:{Authorization:'Key '+hf.key()},signal:AbortSignal.timeout(15000)});
  return json(200,{configured:true,authenticated:r.status===404||r.ok,provider_status:r.status,models:hf.models().map(m=>m.model_id),note:'A funded generation is still needed to verify output end to end.'});
 }catch{return json(200,{configured:true,authenticated:false,note:'Provider connectivity could not be verified.'});}
};
