const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
async function fixture(reduced=false){
 class El{
  constructor(tag='div'){this.tagName=tag;this.children=[];this.listeners={};this.attrs={};this.hidden=false;this.scrollLeft=0;this.clientWidth=600;this.scrollWidth=1800;this.offsetLeft=0;this.offsetWidth=275;this.classList={add(){},remove(){}};}
  append(...xs){this.children.push(...xs)} setAttribute(k,v){this.attrs[k]=v} addEventListener(k,fn){(this.listeners[k]??=[]).push(fn)} emit(k){for(const fn of this.listeners[k]||[])fn({target:this,key:k,preventDefault(){}})}
  querySelectorAll(q){return this.children.flatMap(x=>[...(q.split(',').includes(x.tagName)?[x]:[]),...x.querySelectorAll(q)])}querySelector(q){return this.querySelectorAll(q)[0]}contains(el){return this===el||this.children.some(x=>x.contains(el))}focus(){}play(){this.paused=false;return Promise.resolve()}pause(){this.paused=true}scrollTo({left}){this.scrollLeft=Math.max(0,left)}
 }
 const ids=Object.fromEntries(['rotating-word','start-menu','close-menu','gallery'].map(k=>[k,new El()]));ids['start-menu'].hidden=true;const menu=new El('button'),doc=new El();doc.hidden=false;doc.getElementById=k=>ids[k];doc.querySelector=()=>menu;doc.createElement=tag=>new El(tag);
 let frame,observer;const context={document:doc,window:new El(),matchMedia:()=>({matches:reduced}),setInterval(){},setTimeout(){},performance:{now:()=>0},requestAnimationFrame:fn=>frame=fn,fetch:async()=>({ok:true,json:async()=>[{title:'First',url:'/one.mp4'},{title:'Second',url:'/two.mp4'}]}),IntersectionObserver:class{constructor(fn){observer=fn}observe(){}}};
 vm.runInNewContext(fs.readFileSync('start/start.js','utf8'),context);await new Promise(setImmediate);
 const videos=ids.gallery.querySelectorAll('video'),buttons=ids.gallery.querySelectorAll('button');observer(videos.map(target=>({target,isIntersecting:true})));
 return {gallery:ids.gallery,videos,buttons,frame:time=>frame(time)};
}
test('previews autoplay silently and row advances',async()=>{const f=await fixture();assert(f.videos.every(v=>v.muted&&v.loop&&!v.controls&&!v.paused));f.frame(1000);assert(f.gallery.scrollLeft>0)});
test('tap stops scrolling and enables a single audible player',async()=>{const f=await fixture();f.buttons[0].emit('click');const before=f.gallery.scrollLeft;f.frame(1000);assert.equal(f.gallery.scrollLeft,before);assert.equal(f.videos[0].muted,false);assert.equal(f.videos[0].loop,false);assert.equal(f.videos[0].controls,true);assert.equal(f.videos[1].paused,true)});
test('completion restores silent previews and scrolling',async()=>{const f=await fixture();f.buttons[0].emit('click');f.videos[0].emit('ended');assert(f.videos.every(v=>v.muted&&v.loop&&!v.controls));f.frame(1000);assert(f.gallery.scrollLeft>0)});
test('reduced motion disables automatic scrolling but permits tap playback',async()=>{const f=await fixture(true);f.frame(1000);assert.equal(f.gallery.scrollLeft,0);assert(f.videos.every(v=>v.paused));f.buttons[0].emit('click');assert.equal(f.videos[0].paused,false);assert.equal(f.videos[0].muted,false)});
