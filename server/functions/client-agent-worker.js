'use strict';
const {timingSafeEqual}=require('node:crypto');
const {admin,json}=require('./_supabase');
const {claimAndAdvance}=require('./_client-agent-v2');
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
  const token=String(event.headers.authorization||'').replace(/^Bearer\s+/i,'');if(!/^[a-f0-9]{64}$/.test(token))return json(401,{error:'Unauthorized'});
  const db=admin();const config=await db.from('client_agent_worker_config').select('token').eq('id',true).single();
  if(config.error||!config.data||config.data.token.length!==token.length||!timingSafeEqual(Buffer.from(token),Buffer.from(config.data.token)))return json(401,{error:'Unauthorized'});
  try{await Promise.all([claimAndAdvance(db),claimAndAdvance(db)]);return json(200,{ok:true})}catch(error){console.error('[client-agent worker]',error.message);return json(500,{error:'Worker step failed'})}
};
