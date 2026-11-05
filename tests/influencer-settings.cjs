const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
class Element{
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.dataset={};this.listeners={};this.hidden=false;this.open=false;}
 append(...nodes){for(const n of nodes){if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);n.parent=this;this.children.push(n);}}
 replaceWith(n){const p=this.parent,i=p.children.indexOf(this);if(n.parent)n.parent.children.splice(n.parent.children.indexOf(n),1);p.children.splice(i,1,n);n.parent=p;this.parent=null;}
 setAttribute(k,v){this[k]=v;}removeAttribute(k){delete this[k];}addEventListener(k,fn){this.listeners[k]=fn;}
 showModal(){this.open=true;}close(){this.open=false;}focus(){}scrollIntoView(){}querySelectorAll(){return [];}
}
const ids={};for(const id of ['influencerBuilder','influencerScratch','influencerSettings','influencerSettingsFields','influencerFaceFile','influencerFacePreview','influencerFaceRemove','influencerStatus','influencerAdvancedOpen','influencerSettingsClose','influencerSettingsApply','influencerSettingsRandomize','influencerBack'])ids[id]=new Element('section');
const all=n=>[n,...n.children.flatMap(all)],storage=new Map(),body=new Element('body');body.append(ids.influencerBuilder);ids.influencerBuilder.append(ids.influencerScratch,ids.influencerSettings);ids.influencerSettings.append(ids.influencerSettingsFields);
const context={document:{body,getElementById:id=>ids[id],createElement:t=>new Element(t),createComment:()=>new Element('comment'),querySelector:s=>{const m=s.match(/data-group="([^"]+)"/);return m?all(body).find(n=>n.dataset.group===m[1]):new Element('div');}},window:{addEventListener(){}},sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}}};vm.createContext(context);
for(const name of ['influencer-catalog.js','influencer-scratch.js','influencer-create.js'])vm.runInContext(fs.readFileSync(__dirname+'/../atelier-v2/'+name,'utf8'),context);
const click=id=>ids[id].listeners.click(),api=context.window.FuseInfluencerScratch,fields=()=>ids.influencerScratch.children.filter(n=>n.tag==='fieldset');
assert.equal(fields().length,19);click('influencerAdvancedOpen');assert(ids.influencerSettings.open);assert.equal(fields().length,9);assert.equal(ids.influencerSettingsFields.children.length,10);
api.setSettings({neck:'Long'});click('influencerSettingsClose');assert.equal(api.getSettings().neck,'Standard');assert.equal(fields().length,19);assert.equal(ids.influencerSettingsFields.children.length,0);
click('influencerAdvancedOpen');const radio=all(ids.influencerSettingsFields).find(n=>n.name==='influencer-neck'&&n.value==='Long');radio.checked=true;radio.listeners.change();click('influencerSettingsApply');assert.equal(api.getSettings().neck,'Long');assert.equal(JSON.parse(storage.get('fuse-influencer-scratch-v1')).neck,'Long');
click('influencerAdvancedOpen');click('influencerSettingsRandomize');let prevented=false;ids.influencerSettings.listeners.cancel({preventDefault(){prevented=true;}});assert(prevented);assert.equal(api.getSettings().neck,'Long');assert.equal(fields().length,19);assert.equal(body.style.overflow,undefined);
assert.deepEqual(fields().map(n=>n.dataset.group),Array.from(context.window.FuseInfluencerCatalog,g=>g.id));
console.log('PASS: shared advanced choices; apply persists; close/Escape cancels; randomize; fields return in original order.');

api.setSettings({features:['Freckles','Dimples'],accessories:['Glasses','Jewelry']});const copy=api.getSettings();copy.features.push('Blush');assert.equal(api.getSettings().features.length,2);
click('influencerAdvancedOpen');api.setSettings({features:['Blush']});click('influencerSettingsClose');assert.deepEqual(Array.from(api.getSettings().features),['Freckles','Dimples']);
const toggle=all(body).find(n=>n.id==='influencerPromptEnabled'),textarea=all(body).find(n=>n.id==='influencerPrompt');assert(textarea.hidden&&textarea.disabled);toggle.checked=true;toggle.listeners.change();assert(!textarea.hidden&&!textarea.disabled);textarea.value='Natural studio portrait';textarea.listeners.input();toggle.checked=false;toggle.listeners.change();assert(textarea.hidden&&textarea.disabled);assert.equal(api.getSettings().prompt,'Natural studio portrait');assert.equal(api.getSettings().promptEnabled,false);toggle.checked=true;toggle.listeners.change();assert.equal(textarea.value,'Natural studio portrait');
const glasses=all(body).find(n=>n.name==='influencer-accessories'&&n.value==='Glasses'),none=all(body).find(n=>n.name==='influencer-accessories'&&n.value==='None');none.checked=true;none.listeners.change();assert.equal(api.getSettings().accessories.length,0);assert(!glasses.checked&&none.checked);
console.log('PASS: multiple feature/accessory choices, isolated snapshots, popup cancel, None reset, Prompt toggle/draft persistence.');
