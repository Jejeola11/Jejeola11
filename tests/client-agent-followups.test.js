const test=require('node:test');const assert=require('node:assert/strict');
const {draft}=require('../server/functions/_client-agent-conversation');
const {eligible,processOne}=require('../server/functions/_client-agent-followups');
test('only awaiting-response statuses are eligible for reminder delivery',()=>{for(const status of ['new','replied','lost','won','deposit_paid','delivered'])assert.equal(eligible({status}),false);assert.equal(eligible({status:'asked'}),true)});
test('reply assistant uses supplied conversation, correct model and training',async()=>{
const original=global.fetch;process.env.OPENAI_API_KEY='test-only';
global.fetch=async(url,options)=>{assert.equal(url,'https://api.openai.com/v1/responses');const b=JSON.parse(options.body);assert.equal(b.model,'gpt-6.1-sol');assert.match(b.instructions,/one verified relevant observation/);assert.match(b.instructions,/Never silently discount/);assert.match(b.input,/We have a budget of/);return {ok:true,json:async()=>({output_text:JSON.stringify({subject:'Re: product video',email:'What length and usage do you need?',dm:'What length do you need?',next_step:'Clarify scope',stop:false})})}};
try{const r=await draft({brand_name:'Example',reply_text:'We have a budget of $200'}, {price_amount:300},[]);assert.equal(r.requested_follow_up_at,null);assert.match(r.email,/length/)}finally{global.fetch=original;delete process.env.OPENAI_API_KEY}
});
test('cancelled or replied prospects cannot produce reminder email',async()=>{
let emailed=false,saved;const original=global.fetch;global.fetch=async()=>{emailed=true;throw Error('Must not send')};
const task={id:'task',prospect_id:'p',user_id:'u',lease_token:'lease',contact_at:'2026-10-20T10:00:00Z'};
const db={rpc:async()=>({data:[task]}),from:table=>({select:()=>({eq:()=>({eq:()=>({single:async()=>({data:{status:'replied'}})})})}),update:patch=>({eq:()=>({eq:async()=>{saved=patch;return {}}})})})};
try{await processOne(db);assert.equal(emailed,false);assert.equal(saved.status,'cancelled')}finally{global.fetch=original}
});
