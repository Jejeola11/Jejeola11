'use strict';
const {json}=require('./_supabase');
const wave=require('./_wavespeed-catalogue');
exports.handler=async event=>{
 if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
 try{const models=await wave.catalogue();const out=json(200,{checked_at:new Date().toISOString(),models:models.map(m=>({id:m.model_id,name:m.name,type:m.type,description:m.description,schema:wave.schema(m)}))});out.headers['Cache-Control']='public, s-maxage=3600, stale-while-revalidate=86400';return out}catch{return json(503,{error:'Model catalogue unavailable'})}
};
