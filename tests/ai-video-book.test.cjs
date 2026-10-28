const vm=require('vm'),fs=require('fs'),assert=require('node:assert/strict');
const edition=require('../server/functions/_ai-video-book-v2');
const source=fs.readFileSync(require('path').join(__dirname,'../server/functions/ai-video-book-page.js'),'utf8');
async function run({user={id:'test'},admin=false,unlock=true,page=2,version='2026-10',method='POST'}={}){
 let reads=0;const sandbox={exports:{},__dirname:'/server',console,require:name=>{
  if(name==='fs')return{readFileSync:()=>{reads++;return Buffer.from('cover')}};
  if(name==='path')return require('path');
  if(name==='./_ai-video-book-v2')return edition;
  if(name==='./_supabase')return{getUser:async()=>user,json:(statusCode,body)=>({statusCode,body}),admin:()=>({from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{is_admin:admin}}),limit:async()=>({data:unlock?[{module_key:'ai-video-business-guide'}]:[]})};return q}})};
  throw Error(name);
 }};vm.runInNewContext(source,sandbox);const result=await sandbox.exports.handler({httpMethod:method,body:JSON.stringify({page,edition:version})});return {...result,reads};
}
(async()=>{
 assert.equal((await run({user:null})).statusCode,401);
 assert.equal((await run({unlock:false})).statusCode,403);
 assert.equal((await run({method:'GET'})).statusCode,405);
 for(const page of [0,64,1.5])assert.equal((await run({page})).statusCode,400);
 for(let page=2;page<=edition.length;page++){const r=await run({page});assert.equal(r.statusCode,200);assert.equal(r.body.content.title,edition[page-1].title);assert.equal(r.reads,0)}
 assert.equal((await run({admin:true,unlock:false})).statusCode,200);
 assert.equal((await run({page:1})).reads,1);
 assert.equal((await run({version:'legacy',page:45})).statusCode,200);
 for(const p of edition.slice(1)){assert.ok(p.title);assert.ok(p.body.length);assert.ok(p.body.join(' ').length>100)}
 console.log('PASS: entitlement, admin, bounds, 62 revised pages, cover and legacy reader checks');
})().catch(e=>{console.error(e);process.exit(1)});
