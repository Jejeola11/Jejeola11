const test=require('node:test'),assert=require('node:assert/strict'),Module=require('module');
let owned=[],adminFlag=false,mutations=0;
const db={from(table){return {select(){return this},eq(){return this},maybeSingle(){return Promise.resolve({data:{is_admin:adminFlag}})},then(resolve){return Promise.resolve({data:owned.map(module_key=>({module_key}))}).then(resolve)}}}};
const load=Module._load;Module._load=function(id,...args){if(id==='./_supabase')return {admin:()=>db,getUser:async()=>({id:'user'}),json:(statusCode,data)=>({statusCode,body:JSON.stringify(data),headers:{}})};if(id==='./_client-agent-v2')return {};return load.call(this,id,...args)};
const {handler}=require('../server/functions/client-agent');Module._load=load;
const event=action=>({httpMethod:'POST',body:JSON.stringify({action})});
test('free account receives locked course preview',async()=>{owned=[];assert.equal(JSON.parse((await handler(event('load'))).body).locked,true)});
test('credit balance alone cannot start research',async()=>{owned=[];assert.equal((await handler(event('start'))).statusCode,403)});
test('Money Engine or challenge ownership passes entitlement gate',async()=>{for(const key of ['money','ai-video-client-challenge']){owned=[key];const r=await handler(event('unknown'));assert.notEqual(r.statusCode,403);assert(!r.body.includes('AGENT_COURSE_REQUIRED'));}});
