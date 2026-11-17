const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
const context={require:()=>({}),exports:{}};vm.runInNewContext(fs.readFileSync('server/functions/fuse-earn.js','utf8')+'\nexports.signupCredits=signupCredits;',context);
test('dashboard sums actual mixed historical rewards across pages',async()=>{
 const rows=[...Array.from({length:1000},()=>({delta:1})),{delta:5},{delta:5}];let calls=0;
 const db={from(table){assert.equal(table,'transactions');return {select(){return this},eq(key,value){assert.ok(key==='user_id'&&value==='owner'||key==='reason'&&value==='fuse-referral-signup');return this},order(){return this},async range(a,b){calls++;return {data:rows.slice(a,b+1)}}}}};
 assert.equal(await context.exports.signupCredits(db,'owner'),1010);assert.equal(calls,2);
});
test('failed ledger query never displays invented earnings',async()=>{const q={select(){return this},eq(){return this},order(){return this},range:async()=>({error:new Error('unavailable')})};await assert.rejects(context.exports.signupCredits({from:()=>q},'owner'),/unavailable/)});
