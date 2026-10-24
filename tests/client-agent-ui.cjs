// DOM integration check. Requires happy-dom in the local test environment.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function main(){
 const {Window}=await import('happy-dom');const w=new Window({url:'https://fuseatelier.com/atelier-v2/clients.html'});
 const d=w.document;d.body.innerHTML='<main id="app"></main><span id="creditBalance"></span><div id="notice"></div><dialog id="setupDialog"><div id="setupContent"></div></dialog><dialog id="prospectDialog"><div id="prospectContent"></div></dialog>';
 const state={profile:null,prospects:[],jobs:[],credits:60,research_cost:30};const calls=[];
 for(const dialog of d.querySelectorAll('dialog')){dialog.showModal=()=>{dialog.open=true};dialog.close=()=>{dialog.open=false}}
 w.HTMLElement.prototype.scrollIntoView=function(){};w.confirm=()=>true;w.structuredClone=structuredClone;d.execCommand=()=>true;
 w.addEventListener('error',event=>{console.error(event.error||event.message)});
 w.Fuse={session:async()=>({user:{id:'22222222-2222-4222-8222-222222222222'}}),api:async(_,body)=>{calls.push(body);if(body.action==='load')return state;if(body.action==='profile'){state.profile={...body.profile,version:2,price_amount:Number(body.profile.price_amount)};return {profile:state.profile}}if(body.action==='start'){state.credits=30;state.jobs=[{id:'11111111-1111-4111-8111-111111111111',status:'searching',market:body.market,message:'Checking sources.',created_at:new Date().toISOString()}];return {job:state.jobs[0],credits:30}}if(body.action==='status')return {job:state.jobs[0]};if(body.action==='update-prospect'){Object.assign(state.prospects[0],body);return {prospect:state.prospects[0]}}throw Error('Unexpected action '+body.action)}};
 w.eval(fs.readFileSync('atelier-v2/client-agent.js','utf8'));await tick();await tick();
 const click=text=>{const b=[...d.querySelectorAll('button')].find(x=>x.textContent.trim()===text);assert.ok(b,'Button not found: '+text);b.click()};
 const fill=(name,value)=>{const el=d.querySelector(`[name="${name}"]`);assert.ok(el,name);el.value=value};
 click('Set up my agent →');assert.equal(d.querySelector('#setupDialog').open,true);
 for(const [k,v] of Object.entries({name:'Ria',skill:'AI product videos',portfolio:'https://portfolio.example',project_0_title:'Serum concept',project_0_url:'https://portfolio.example/serum',project_0_description:'A self-initiated product demonstration.'}))fill(k,v);
 click('Continue →');
 for(const [k,v] of Object.entries({buyer:'Skincare brands',purpose:'Explain one product',offer_title:'One product video',deliverables:'One video',length:'30 seconds',formats:'9:16',included:'Script, edit and captions',client_inputs:'Approved photos and facts',turnaround:'3 business days after approval',revisions:'One round',price_amount:'150'}))fill(k,v);
 click('Continue →');fill('market','United Kingdom');click('Review my agent →');
 d.querySelector('[name="approved"]').checked=true;click('Confirm my offer →');await tick();await tick();assert.equal(state.profile.price_amount,150);assert.equal(state.profile.revisions,'One round');assert.equal(d.querySelector('#setupDialog').open,false);
 click('Find 5 prospects →');await tick();await tick();assert.equal(calls.filter(x=>x.action==='start').length,1);assert.match(d.body.textContent,/Your five prospects are taking shape/);assert.equal(d.querySelector('#startResearch').disabled,true);
 click('My Offer');assert.match(d.body.textContent,/One product video/);assert.match(d.body.textContent,/3 business days after approval/);
 state.jobs[0].status='completed';state.jobs[0].result_count=1;state.jobs[0].credits_refunded=24;
 state.prospects.push({id:'33333333-3333-4333-8333-333333333333',brand_name:'Fixture Beauty',status:'new',location:'United Kingdom',website:'https://example.test',current_activity:'Serum available with refill options.',email:'hello@example.test',pitch_email:'A factual email draft.',pitch_instagram:'A factual DM.',qualification_json:{version:2,agent_job_id:state.jobs[0].id,description:'A skincare brand',buyer_fit:'Product video fit',opportunity:'A suggested product demonstration',approach:'ASK-FIRST',approach_reason:'Custom assets need approval',subject:'Product video idea',contacts:[{kind:'email',value:'hello@example.test',source_url:'https://example.test/contact',quote:'Business enquiries: hello@example.test'}],evidence:[{source_url:'https://example.test',quote:'Fixture Beauty creates skincare products.'}]}});
 click('Discover');await tick();await tick();
 click('Review prospect →');click('Contacts');assert.match(d.querySelector('#prospectContent').textContent,/hello@example.test/);
 click('Your pitch');click('Copy email');await tick();assert.equal(state.prospects[0].status,'new');
 click('Track');d.querySelector('#trackStatus').value='asked';d.querySelector('#trackNotes').value='Sent a researched email.';click('Save next step');await tick();await tick();assert.equal(state.prospects[0].status,'asked');assert.match(d.querySelector('#detailStatus').textContent,/Saved/);
 await w.happyDOM.abort();console.log('PASS: three-step setup, approval, exact scope and price, research progress, duplicate-click prevention, offer navigation, evidence and contacts, copy does not mark contacted, saved tracking.');
}
main().catch(e=>{console.error(e);process.exitCode=1});
