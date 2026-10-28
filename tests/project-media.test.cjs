const test=require('node:test'),assert=require('node:assert/strict'),Module=require('module');
const load=Module._load;Module._load=function(id,...args){if(id==='../start/project-parts.json')return {'0':{bytes:12,chunkSize:5,parts:['ABCDE','FGHIJ','KL']}};return load.call(this,id,...args)};
const handler=require('../api/project-media');Module._load=load;
global.fetch=async value=>({ok:true,arrayBuffer:async()=>Buffer.from(value)});
async function request(range,method='GET'){const headers={},chunks=[];const res={statusCode:200,headersSent:false,setHeader(k,v){headers[k]=v},write(data){this.headersSent=true;chunks.push(data);return true},end(){}};await handler({method,query:{id:'0'},headers:range?{range}:{}},res);return {status:res.statusCode,headers,body:Buffer.concat(chunks).toString()};}
test('byte range crosses original part boundaries without changing bytes',async()=>{const r=await request('bytes=3-8');assert.equal(r.status,206);assert.equal(r.body,'DEFGHI');assert.equal(r.headers['Content-Range'],'bytes 3-8/12')});
test('suffix range supports seeking to end of original video',async()=>assert.equal((await request('bytes=-3')).body,'JKL'));
test('HEAD returns full size and no body',async()=>{const r=await request(null,'HEAD');assert.equal(r.headers['Content-Length'],12);assert.equal(r.body,'')});
test('out of bounds ranges return 416',async()=>assert.equal((await request('bytes=20-30')).status,416));
