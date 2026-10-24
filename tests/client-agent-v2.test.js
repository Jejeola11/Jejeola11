const test=require('node:test');
const assert=require('node:assert/strict');
const web=require('../server/functions/_client-agent-safe-web');
const agent=require('../server/functions/_client-agent-v2');
const profile=agent.profile({skill:'AI product videos',buyer:'Skincare brands',purpose:'Explain one product',offer_title:'One product video',deliverables:'One 30-second video',formats:'9:16',included:'Script, captions and edit',client_inputs:'Approved product photos and facts',turnaround:'3 business days after approval',revisions:'One round',market:'United Kingdom',price_amount:150,currency:'USD',portfolio:'https://portfolio.example/',approved:true,projects:[{title:'Serum concept',url:'https://portfolio.example/serum',description:'A self-initiated product presentation with captions',kind:'concept'}]});
test('approved scope, price and real project descriptions survive normalization',()=>{assert.equal(profile.price_amount,150);assert.equal(profile.turnaround,'3 business days after approval');assert.equal(profile.projects[0].kind,'concept');assert.deepEqual(agent.missing(profile),[]);assert.notEqual(agent.profile({...profile,price_amount:200}).fingerprint,profile.fingerprint)});
test('requires proof and refuses executable or private URL schemes',()=>{assert.equal(web.safeUrl('javascript:alert(1)'), '');assert.equal(web.safeUrl('http://user:password@example.com'), '');assert.equal(web.safeUrl('http://localhost/foo'), '');for(const ip of ['127.0.0.1','10.0.0.1','169.254.169.254','::1','::ffff:127.0.0.1'])assert.equal(web.publicIP(ip),false);assert.equal(web.publicIP('8.8.8.8'),true);assert.ok(agent.missing(agent.profile({})).length>5)});
test('generic or stale activity is not accepted as a recent opportunity',()=>{assert.equal(agent.dateSupported({type:'dated_activity',date:'2020-01-01'},{text:'January 1, 2020'}),false);assert.equal(agent.dateSupported({type:'ongoing_offer',date:'',quote:'Shop now'},{}),false);assert.equal(agent.dateSupported({type:'dated_activity',date:'2099-01-01'},{text:'2099-01-01'}),false)});
test('verification checks real page quotes and never changes a phone into WhatsApp',async()=>{
  const original=web.readPage;
  const copy='Example Beauty produces skincare products for everyday use. Explore our fragrance-free hydration serum, available in two sizes with refill options. Our business phone is +44 1234 567890. Contact hello@example.test for business enquiries.';
  web.readPage=async url=>({url,text:copy,raw:copy,checked_at:new Date().toISOString()});
  try{
    const raw={name:'Example Beauty',website:'https://example.test',identity:{source_url:'https://example.test',quote:'Example Beauty produces skincare products for everyday use.'},activity:{type:'ongoing_offer',date:'',source_url:'https://example.test',quote:'Explore our fragrance-free hydration serum, available in two sizes with refill options.',summary:'Hydration serum available with refill options.'},contacts:[{kind:'phone',value:'+44 1234 567890',source_url:'https://example.test',quote:'Our business phone is +44 1234 567890.'},{kind:'email',value:'madeup@example.test',source_url:'https://example.test',quote:'Contact hello@example.test for business enquiries.'}]};
    const result=await agent.verifyCandidate(raw,profile);assert.ok(result);assert.equal(result.contacts.length,1);assert.equal(result.contacts[0].kind,'phone');assert.equal(result.person,null);
    const rejected=await agent.verifyCandidate({...raw,activity:{...raw.activity,quote:'This campaign never appeared on the actual page.'}},profile);assert.equal(rejected,null);
  }finally{web.readPage=original}
});
test('sample-first requires existing proof and generated rows retain the exact offer',()=>{
  const lead={name:'Example Beauty',website:'https://example.test',contacts:[{kind:'email',value:'hello@example.test'}],identity:{source_url:'https://example.test',quote:'identity'},activity:{summary:'A current specific product',source_url:'https://example.test',date:'2026-10-24'},missing:[]};
  const draft={name:lead.name,approach:'SAMPLE-FIRST',project_index:0,project_match:'A matching product concept',subject:'Serum video idea',email:'An email grounded in the supplied product.',dm:'A short message.',best_channel:'email'};
  const [row]=agent.assembleRows(profile,[lead],[draft],{id:'job'});assert.equal(row.offer_price,150);assert.equal(row.offer_currency,'USD');assert.equal(row.qualification_json.approach,'SAMPLE-FIRST');assert.equal(row.qualification_json.approved_offer.revisions,'One round');
  assert.deepEqual(agent.assembleRows(profile,[lead],[{...draft,project_index:99}],{id:'job'}),[]);
});
