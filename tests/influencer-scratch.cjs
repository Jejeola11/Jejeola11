const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.listeners={};}append(...nodes){this.children.push(...nodes);}setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}addEventListener(k,fn){this.listeners[k]=fn;}}
const root=new Element('section'),status=new Element('p'),storage=new Map([['fuse-influencer-scratch-v1',JSON.stringify({gender:'Non-binary',build:'invalid'})]]);
const context={document:{getElementById:id=>id==='influencerScratch'?root:status,createElement:tag=>new Element(tag)},window:{addEventListener(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}};vm.createContext(context);
for(const name of ['influencer-catalog.js','influencer-scratch.js'])vm.runInContext(fs.readFileSync(__dirname+'/../atelier-v2/'+name,'utf8'),context);
assert.equal(root.children.length,14);assert.equal(context.window.FuseInfluencerScratch.getSettings().gender,'Non-binary');assert.equal(context.window.FuseInfluencerScratch.getSettings().build,'Slim');
const all=node=>[node,...node.children.flatMap(all)];const nodes=all(root);const radio=nodes.find(n=>n.name==='influencer-character'&&n.value==='Cat');radio.checked=true;radio.listeners.change();assert.equal(context.window.FuseInfluencerScratch.getSettings().character,'Cat');assert.equal(JSON.parse(storage.get('fuse-influencer-scratch-v1')).character,'Cat');
const snapshot=context.window.FuseInfluencerScratch.getSettings();snapshot.character='Dog';assert.equal(context.window.FuseInfluencerScratch.getSettings().character,'Cat');
const upload=nodes.find(n=>n.type==='file');upload.files=[{type:'text/html',size:10}];upload.listeners.change();assert.match(status.textContent,/JPG/);upload.files=[{type:'image/png',size:100}];upload.listeners.change();assert(nodes.some(n=>n.tag==='img'&&n.src==='blob:test'&&!n.hidden));
console.log('PASS: all 14 groups; saved choices validated; selection persists; snapshot isolated; style upload accepts images and rejects other files.');


const artImages=nodes.filter(n=>n.tag==='img'&&n.src?.startsWith('/atelier-v2/assets/influencer/'));assert.equal(artImages.length,76);for(const img of artImages){assert(fs.statSync(__dirname+'/..'+img.src).size>0);assert.equal(img.loading,'lazy');}console.log('PASS: 76 unique original artwork cards point to nonempty local files.');
