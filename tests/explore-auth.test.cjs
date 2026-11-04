'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const create=require('../atelier-v2/explore-auth');
class Element{
 constructor(tag){this.tagName=tag;this.children=[];this.nodes=new Map();this.listeners={};this.open=false;this.textContent='';}
 append(...items){this.children.push(...items)}
 replaceChildren(...items){this.children=items}
 setAttribute(k,v){this[k]=v}
 removeAttribute(k){delete this[k]}
 addEventListener(k,fn){this.listeners[k]=fn}
 querySelector(k){if(!this.nodes.has(k))this.nodes.set(k,new Element('button'));return this.nodes.get(k)}
 showModal(){this.open=true}
 close(){this.open=false}
 focus(){this.focused=true}
}
function fixture({session=null,records=new Map(),storage=new Map(),pathname='/atelier-v2/studio.html',search=''}={}){
 const nav=[],body=new Element('body'),head=new Element('head'),active=new Element('button');
 const indexedDB={open(){const req={};queueMicrotask(()=>{req.result={objectStoreNames:{contains:()=>true},close(){},transaction(){const tx={};tx.objectStore=()=>({put(data,k){records.set(k,structuredClone(data));const r={result:k};queueMicrotask(()=>tx.oncomplete());return r},get(k){const r={result:records.get(k)};queueMicrotask(()=>tx.oncomplete());return r},delete(k){records.delete(k);const r={};queueMicrotask(()=>tx.oncomplete());return r}});return tx}};req.onsuccess()});return req}};
 const client={auth:{getSession:async()=>({data:{session}})}};
 const root={indexedDB,location:{origin:'https://fuseatelier.com',pathname,search,hash:'#composer',assign:url=>nav.push(url)},sessionStorage:{setItem:(k,v)=>storage.set(k,v),getItem:k=>storage.get(k),removeItem:k=>storage.delete(k)},document:{head,body,activeElement:active,createElement:tag=>new Element(tag)},__fuseClient:client};
 const api=create(root);return {api,root,nav,body,records,storage,client};
}
test('loading and browsing never triggers a signup dialog or redirect',async()=>{
 const f=fixture();assert.equal(await f.api.session(),null);assert.equal(f.nav.length,0);assert.equal(f.body.children.length,0);
 const panel=new Element('main');f.api.preview(panel,{title:'Client Finder',description:'Explore first'});assert.equal(f.nav.length,0);assert.equal(f.body.children.length,0);
});
test('only an explicit account action prompts; cancelling preserves the page',async()=>{
 const f=fixture();assert.equal(await f.api.requireAccount({reason:'Save your work'}),null);
 assert.equal(f.nav.length,0);const modal=f.body.children[0];assert.equal(modal.open,true);
 modal.querySelector('[data-cancel]').onclick();assert.equal(modal.open,false);assert.equal(f.nav.length,0);
});
test('continue preserves exact destination and return anchor with referral',async()=>{
 const f=fixture({search:'?ref=d65a950a'});let continued=false;
 await f.api.requireAccount({reason:'Generate',onContinue:()=>continued=true});f.body.children[0].querySelector('[data-continue]').onclick();
 const u=new URL(f.nav[0],'https://fuseatelier.com');assert(continued);assert.equal(u.pathname,'/signup');
 assert.equal(u.searchParams.get('next'),'/atelier-v2/studio.html?ref=d65a950a#composer');assert.equal(u.searchParams.get('return'),u.searchParams.get('next'));assert.equal(u.searchParams.get('ref'),'d65a950a');
});
test('authenticated actions return the existing session without signup or redirect',async()=>{
 const session={user:{id:'buyer'}};const f=fixture({session});assert.equal(await f.api.requireAccount({reason:'Generate'}),session);assert.equal(f.body.children.length,0);assert.equal(f.nav.length,0);
});
test('draft survives signup and cancellation with prompt, model, settings and reference bytes',async()=>{
 const f=fixture();const file=new Blob(['exact reference bytes'],{type:'image/png'});
 await f.api.registerDraft('composer',{capture:()=>({prompt:'Keep this prompt',model:'seedance-2.5',settings:{duration:10,resolution:'480p'},files:[file]}),restore:()=>{}});
 await f.api.requireAccount({reason:'Generate',draft:'composer'});assert.equal(f.records.size,1);
 f.body.children[0].querySelector('[data-cancel]').onclick();assert.equal(f.nav.length,0);
 const back=fixture({records:f.records,storage:f.storage,session:{user:{id:'new-user'}}});let restored;
 await back.api.registerDraft('composer',{capture:()=>({}),restore:data=>{restored=data}});
 assert.equal(restored.prompt,'Keep this prompt');assert.equal(restored.settings.duration,10);assert.equal(restored.model,'seedance-2.5');assert.equal(await restored.files[0].text(),'exact reference bytes');assert.equal(back.records.size,0);assert.equal(back.nav.length,0);
});
test('blocked file storage warns honestly and keeps text/settings fallback',async()=>{
 const f=fixture();f.root.indexedDB=null;
 await f.api.registerDraft('image',{capture:()=>({prompt:'Saved locally',files:[new Blob(['x'])]}),restore:()=>{}});
 await f.api.requireAccount({draft:'image'});assert.match(f.body.children[0].querySelector('[data-draft]').textContent,/reattach/);
 let saved;await f.api.registerDraft('image',{capture:()=>({}),restore:data=>saved=data});assert.equal(saved.prompt,'Saved locally');
});
test('external next and return URLs cannot redirect an account action off-site',()=>{
 const f=fixture();const u=new URL(f.api.authURL('https://evil.example','//evil.example'),'https://fuseatelier.com');assert(u.searchParams.get('next').startsWith('/atelier-v2/'));assert(u.searchParams.get('return').startsWith('/atelier-v2/'));
});
test('no timed/entry signup guards remain in shared shell, balance helper or navigation',()=>{
 for(const name of ['fuse-shell','auth-shell','public-home']){
  const source=fs.readFileSync(require.resolve('../atelier-v2/'+name+'.js'),'utf8');
  assert(!source.includes('installGuestRedirect'),name);assert(!source.includes('const protectedPages='),name);assert(!/location\.(?:replace|assign)\('\/signup/.test(source),name);
 }
});
test('the composer asks for an account before upload, debit or submission',()=>{
 const source=fs.readFileSync(require.resolve('../atelier-v2/create-composer.js'),'utf8');
 const start=source.indexOf('async function generate(){'),end=source.indexOf('async function restoreThreads',start),generate=source.slice(start,end);
 assert(generate.indexOf('FuseExplore.requireAccount')<generate.indexOf('state.busy=true'));
 assert(source.includes("registerDraft('composer'"));assert(source.includes("if(!session)continue;"));
});
test('expired drafts are discarded and drafts never cross page boundaries',async()=>{
 const f=fixture();f.records.set('/atelier-v2/studio.html:composer',{created:Date.now()-3*60*60*1000,data:{prompt:'old'}});let restored=false;
 await f.api.registerDraft('composer',{capture:()=>({}),restore:()=>restored=true});assert.equal(restored,false);assert.equal(f.records.size,0);
 f.records.set('/atelier-v2/image-create.html:composer',{created:Date.now(),data:{prompt:'other page'}});
 await f.api.registerDraft('composer',{capture:()=>({}),restore:()=>restored=true});assert.equal(restored,false);
});
test('Client Finder guest startup shows a preview without private API requests',async()=>{
 const f=fixture({pathname:'/atelier-v2/clients.html'}),elements=new Map();let calls=0;
 function node(id){if(!elements.has(id)){const n=new Element('div');n.dataset={};n.value='';n.style={};n.classList={add(){},remove(){},toggle(){}};n.getBoundingClientRect=()=>({bottom:0});elements.set(id,n)}return elements.get(id)}
 const doc={...f.root.document,getElementById:node,querySelectorAll:()=>[],addEventListener(){}};
 const context={document:doc,window:{addEventListener(){}},FuseExplore:f.api,Fuse:{session:async()=>{throw Error('Guest must not use private session')},api:async()=>{calls++;throw Error('Private request')}},location:{search:'',pathname:'/atelier-v2/clients.html'},localStorage:{getItem:()=>null},URL,URLSearchParams,Set,Map,Date,console,setInterval(){},setTimeout(){},crypto:require('node:crypto').webcrypto};
 vm.runInNewContext(fs.readFileSync(require.resolve('../atelier-v2/client-agent.js'),'utf8'),context);
 await new Promise(r=>setImmediate(r));assert.equal(calls,0);assert.equal(f.nav.length,0);assert.equal(node('app').children[0].children[0].textContent,'Find your next client with Fuse');
});
