const test=require('node:test'),assert=require('node:assert/strict'),Module=require('module');
let user,status,suppressed,writes,captured;
const db={from(table){return {select(){return this},eq(){return this},limit:async()=>({data:suppressed?[{id:'s'}]:[]}),update(value){writes.push(value);return this},then(resolve){resolve({error:null})}}}};
const original=Module._load;Module._load=function(id,...args){if(id==='./_supabase')return {admin:()=>db,getUser:async()=>user,json:(statusCode,body)=>({statusCode,body})};if(id==='./_platform-audience')return {captureSignup:async(db,value)=>{captured=value;return {id:'c',email_marketing_status:status}}};return original.call(this,id,...args)};
const {handler}=require('../server/functions/public-registration-sync');Module._load=original;
const event=body=>({httpMethod:'POST',body:JSON.stringify(body)});
function reset(){user={id:'u',email:'verified@example.com',email_confirmed_at:'today'};status='unknown';suppressed=false;writes=[];captured=null;}
test('requires a verified session',async()=>{reset();user=null;assert.equal((await handler(event({}))).statusCode,401);user={email:'a@b.com'};assert.equal((await handler(event({}))).statusCode,403)});
test('only subscribes opted-in verified identity',async()=>{reset();assert.equal((await handler(event({email:'spoof@example.com',marketingOptIn:true}))).statusCode,200);assert.equal(captured.email,'verified@example.com');assert.equal(writes[0].email_marketing_status,'subscribed')});
test('no consent, opt-outs and suppressions never subscribe',async()=>{for(const setting of ['none','unsubscribed','suppressed']){reset();if(setting==='unsubscribed')status=setting;if(setting==='suppressed')suppressed=true;await handler(event({marketingOptIn:setting!=='none'}));assert.equal(writes.length,0)}});
