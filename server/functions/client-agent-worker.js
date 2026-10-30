'use strict';
const {timingSafeEqual}=require('node:crypto');
const {admin,json}=require('./_supabase');
const {processOne}=require('./_client-agent-followups');
const {claimAndAdvance}=require('./_client-agent-v2');
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  const token=String(event.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!/^[a-f0-9]{64}$/.test(token))return json(401,{error:'Unauthorized'});
  const db=admin();const config=await db.from('client_agent_worker_config').select('token').eq('id',true).single();
  if(config.error||!config.data||config.data.token.length!==token.length||!timingSafeEqual(Buffer.from(token),Buffer.from(config.data.token)))return json(401,{error:'Unauthorized'});
  try{let body={};try{body=JSON.parse(event.body||'{}')}catch{}
  if(body.action==='check-model'){const {openAI,MODEL}=require('./_client-agent-v2');const model=await openAI('models/'+MODEL);return json(200,{ok:model.id===MODEL,model:model.id,email_configured:!!(process.env.RESEND_API_KEY&&process.env.FUSE_EMAIL_FROM)})}
  await Promise.all([claimAndAdvance(db),claimAndAdvance(db),processOne(db)]);return json(200,{ok:true})}catch(error){console.error('[client-agent worker]',error.message);return json(500,{error:'Worker step failed'})}
};
