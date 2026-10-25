'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const web=require('../server/functions/_client-agent-safe-web');
const factory=require('../server/functions/_client-contact-research');
const business={name:'Kate Milford Productions',website:'https://www.katemilfordproductions.com/',location:'Denver'};
const pages=[{url:business.website+'about',text:'About Kate Milford. Kate Milford is a commercial photographer and producer.',raw:'About Kate Milford. Kate Milford is a commercial photographer and producer.'},{url:business.website+'contact',text:'Let’s work together — email me at kate@katemilfordproductions.com for campaign enquiries.',raw:'Let’s work together — email me at kate@katemilfordproductions.com for campaign enquiries.'}];
const result={person:{name:'Kate Milford',role:'commercial photographer and producer',source_url:pages[0].url,quote:pages[0].text},contacts:[{kind:'email',value:'kate@katemilfordproductions.com',source_url:pages[1].url,quote:pages[1].text}]};
const deps={...web,domain:u=>new URL(u).hostname,clean:(v,n)=>String(v||'').slice(0,n),sourceText:v=>String(v),evidenceMatches:(p,e)=>web.quotePresent(p.text,e.quote),firecrawl:{enabled:()=>false}};
test('dedicated pass opens About and Contact and retains verified Kate details',async()=>{
 const visited=[];const engine=factory({...deps,sourcePage:async u=>{visited.push(u);return pages.find(p=>p.url===u)||null},openAI:async()=>result,jsonOutput:x=>x});
 const r=await engine.research(business);assert.equal(r.person.name,'Kate Milford');assert.equal(r.contacts[0].value,'kate@katemilfordproductions.com');assert.equal(r.status,'verified');assert.ok(visited.includes(pages[1].url));
});
test('rejects invented emails, fabricated quotes and non-WhatsApp URLs',()=>{
 const engine=factory(deps);const r=engine.validate({person:{...result.person,quote:'Invented founder statement not published anywhere.'},contacts:[{...result.contacts[0],value:'founder@katemilfordproductions.com'},{kind:'whatsapp',value:business.website,source_url:pages[0].url,quote:pages[0].text}]},business,pages);assert.equal(r.person,null);assert.deepEqual(r.contacts,[]);
});
test('inaccessible pages are distinguished from no public results',async()=>{
 const engine=factory({...deps,sourcePage:async()=>null});const r=await engine.research(business);assert.equal(r.status,'inaccessible');assert.equal(r.pages_checked.length,0);
});
