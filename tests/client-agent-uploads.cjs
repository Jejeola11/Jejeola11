const fs=require('node:fs'),assert=require('node:assert/strict');
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const {Window}=await import('happy-dom'),w=new Window({url:'https://fuseatelier.com/atelier-v2/clients.html'}),d=w.document;
 d.body.innerHTML=fs.readFileSync('atelier-v2/clients.html','utf8').match(/<body[^>]*>([\s\S]*)<\/body>/)[1];
 for(const el of d.querySelectorAll('dialog')){el.showModal=()=>el.open=true;el.close=()=>el.open=false}
 w.structuredClone=structuredClone;w.HTMLElement.prototype.scrollIntoView=function(){};
 const uploads=[];let fail=false;
 w.Fuse={session:async()=>({user:{id:'22222222-2222-4222-8222-222222222222'}}),api:async()=>({profile:null,prospects:[],jobs:[],credits:60,research_cost:30}),client:async()=>({storage:{from:bucket=>({upload:async(path,file,opts)=>{uploads.push({bucket,path,file,opts});return fail?{error:new Error('Connection interrupted')}:{error:null}},getPublicUrl:path=>({data:{publicUrl:'https://storage.example/'+path}})})}})};
 w.eval(fs.readFileSync('atelier-v2/client-agent.js','utf8'));await tick();await tick();d.querySelector('[data-setup]').click();
 d.querySelector('[name=skill]').value='AI video and image production';d.querySelector('[name=project_0_description]').value='A product concept I made.';
 async function choose(file){const input=d.querySelector('[data-upload-project="0"]');Object.defineProperty(input,'files',{value:[file],configurable:true});input.dispatchEvent(new w.Event('change'));await tick();await tick()}
 await choose(new w.File(['video fixture'],'sample.mp4',{type:'video/mp4'}));
 assert.equal(uploads.length,1);assert.equal(uploads[0].bucket,'avatars');assert.match(uploads[0].path,/^22222222-2222-4222-8222-222222222222\/client-proof\/.*\.mp4$/);assert.equal(uploads[0].opts.upsert,false);assert.ok(d.querySelector('video.project-preview'));assert.equal(d.querySelector('[name=project_0_description]').value,'A product concept I made.');
 const videoLink=d.querySelector('[name=project_0_url]').value;fail=true;await choose(new w.File(['x'],'photo.png',{type:'image/png'}));assert.equal(d.querySelector('[name=project_0_url]').value,videoLink);assert.match(d.getElementById('uploadStatus0').textContent,/Upload failed/);assert.equal(d.getElementById('setupContinue').disabled,false);
 fail=false;await choose(new w.File(['x'],'photo.png',{type:'image/png'}));assert.ok(d.querySelector('img.project-preview'));assert.match(d.querySelector('[name=project_0_url]').value,/\.png$/);
 await choose(new w.File(['<svg/>'],'unsafe.svg',{type:'image/svg+xml'}));assert.equal(uploads.length,3);
 d.querySelector('[name=portfolio]').value='';d.getElementById('setupContinue').click();assert.match(d.getElementById('setupTitle').textContent,/hire you/);
 await w.happyDOM.abort();console.log('PASS video/image uploads, owner paths, previews, retry, retained fields, type validation and setup without portfolio website');
})().catch(e=>{console.error(e);process.exitCode=1});
