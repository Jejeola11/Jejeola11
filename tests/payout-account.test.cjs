const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup({ user = { id: 'user-1' }, failResolve = false, failSave = false } = {}) {
 const writes=[], urls=[];
 const context={exports:{},require:()=>({getUser:async()=>user,json:(statusCode,b)=>({statusCode,body:JSON.stringify(b)}),admin:()=>({from:()=>({upsert:async data=>{writes.push(data);return {error:failSave?{}:null}}})})}),process:{env:{PAYSTACK_SECRET_KEY:'test'}},URLSearchParams,AbortSignal,Map,Date,fetch:async url=>{
  urls.push(url);
  if(url.includes('/bank?'))return {ok:true,json:async()=>({status:true,data:[{name:'Test Bank',code:'058',active:true}]})};
  return {ok:!failResolve,json:async()=>({status:!failResolve,data:{account_name:'BANK VERIFIED NAME',account_number:'0123456789'}})};
 }};
 vm.runInNewContext(fs.readFileSync('server/functions/payout-account.js','utf8'),context);
 return {writes,urls,call:async body=>{const r=await context.exports.handler({httpMethod:'POST',headers:{},body:JSON.stringify(body)});return {...r,data:JSON.parse(r.body)}}};
}
test('authentication required before bank lookup',async()=>{const s=setup({user:null});assert.equal((await s.call({action:'banks'})).statusCode,401);assert.equal(s.urls.length,0)});
test('invalid account and unsupported bank never save',async()=>{const s=setup();assert.equal((await s.call({action:'save',account_number:'123',bank_code:'058'})).statusCode,400);assert.equal((await s.call({action:'save',account_number:'0123456789',bank_code:'999'})).statusCode,400);assert.equal(s.writes.length,0)});
test('save resolves again and ignores spoofed client names and user ID',async()=>{const s=setup();const r=await s.call({action:'save',bank_code:'058',account_number:'0123456789',account_name:'SPOOF',full_name:'SPOOF',user_id:'other'});assert.equal(r.statusCode,200);assert.equal(s.writes[0].account_number,'0123456789');assert.equal(s.writes[0].account_name,'BANK VERIFIED NAME');assert.equal(s.writes[0].full_name,'BANK VERIFIED NAME');assert.equal(s.writes[0].user_id,'user-1');assert.ok(s.urls[1].includes('account_number=0123456789'))});
test('failed verification prevents saving',async()=>{const s=setup({failResolve:true});assert.equal((await s.call({action:'save',bank_code:'058',account_number:'0123456789'})).statusCode,422);assert.equal(s.writes.length,0)});
test('database error is not reported as saved',async()=>{const s=setup({failSave:true});assert.equal((await s.call({action:'save',bank_code:'058',account_number:'0123456789'})).statusCode,500)});
test('resolve does not save payout or make transfers',async()=>{const s=setup();const r=await s.call({action:'resolve',bank_code:'058',account_number:'0123456789'});assert.equal(r.data.account_name,'BANK VERIFIED NAME');assert.equal(s.writes.length,0);assert.ok(s.urls.every(url=>url.includes('/bank')))});
