'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const funnel=require('../atelier-v2/course-funnel');
const source=fs.readFileSync(require.resolve('../atelier-v2/learn.js'),'utf8');
const offer='/atelier-v2/ocean-eyes-halloween.html?ref=d65a950a#page-6';
const buy=funnel.checkoutURL('video',offer,'?ref=d65a950a');
async function academy(search,{signedIn=false,keys=[],apiError=false}={}){
 const nav=[],payments=[],buttons=[];
 const status={textContent:'',after:b=>buttons.push(b)};
 const sb={auth:{getSession:async()=>({data:{session:signedIn?{user:{id:'buyer',email:'buyer@example.com'}}:null}}),getUser:async()=>({data:{user:{id:'buyer'}}}),onAuthStateChange(){}},from:table=>({select(){return this},eq(){return table==='profiles'?this:Promise.resolve({data:keys.map(module_key=>({module_key}))})},maybeSingle:async()=>({data:{is_admin:false}})})};
 const document={querySelectorAll:()=>[],getElementById:id=>id==='courseStatus'?status:null,querySelector:()=>null,createElement:()=>({addEventListener(type,fn){this.click=fn}})};
 vm.runInNewContext(source,{document,window:{},FuseCourseFunnel:funnel,Fuse:{client:async()=>sb,api:async(path,body)=>{payments.push([path,body]);if(apiError)throw Error('Checkout unavailable');return {authorization_url:'https://checkout.paystack.com/test-checkout'}}},location:{pathname:'/atelier-v2/learn.html',search,assign:url=>nav.push(['assign',url]),replace:url=>nav.push(['replace',url])},URL,URLSearchParams,Set,console});
 await new Promise(r=>setImmediate(r));
 return {nav,payments,buttons,status};
}
test('public tutorials and explicit course checkout never install guest redirect timers',()=>{
 const shell=fs.readFileSync(require.resolve('../atelier-v2/fuse-shell.js'),'utf8');
 const installer=shell.slice(shell.indexOf('  (function installGuestRedirect(){'),shell.indexOf('  const signupStyle='));
 for(const page of ['ocean-eyes-halloween.html','free-ai-tutorial.html','free-prompts-workflows.html','realistic-images.html','learn.html?buy=video']){
  const url=new URL('/atelier-v2/'+page,'https://fuseatelier.com');let intervals=0;
  assert(funnel.isPublicPage(url.pathname,url.search));
  vm.runInNewContext(installer,{uninterruptedCoursePage:true,location:url,setInterval(){intervals++}});
  assert.equal(intervals,0,page);
 }
 assert.equal(funnel.isPublicPage('/atelier-v2/home.html'),false);
 assert.equal(funnel.isPublicPage('/atelier-v2/studio.html'),false);
});
test('signup preserves course, referral and offer return without a checkout loop',async()=>{
 const state=await academy(new URL(buy,'https://fuseatelier.com').search);
 assert.equal(state.payments.length,0);
 const signup=new URL(state.nav[0][1],'https://fuseatelier.com');
 assert.equal(signup.pathname,'/signup');assert.equal(signup.searchParams.get('ref'),'d65a950a');
 assert.equal(signup.searchParams.get('return'),offer);
 const next=new URL(signup.searchParams.get('next'),'https://fuseatelier.com');assert.equal(next.searchParams.get('buy'),'video');
 const resumed=await academy(next.search,{signedIn:true});
 assert.equal(resumed.payments[0][0],'paystack-init');assert.equal(resumed.payments[0][1].pack,'academy-video');
 assert.deepEqual(resumed.nav,[['assign','https://checkout.paystack.com/test-checkout']]);
});
test('existing course owner opens their course without paying again',async()=>{
 const state=await academy('?buy=video',{signedIn:true,keys:['aiv-m1']});
 assert.equal(state.payments.length,0);assert.deepEqual(state.nav,[['replace','academy-v2.html?course=video']]);
});
test('verified payment return opens course only after access check succeeds',async()=>{
 const paid=await academy('?payment=success&course=video',{signedIn:true,keys:['aiv-m1']});
 assert.deepEqual(paid.nav,[['replace','academy-v2.html?course=video']]);
 const unowned=await academy('?payment=success&course=video',{signedIn:true});assert.equal(unowned.nav.length,0);
});
test('checkout failure keeps a visible retry action and does not navigate',async()=>{
 const state=await academy('?buy=video',{signedIn:true,apiError:true});
 assert.equal(state.nav.length,0);assert.equal(state.buttons[0].hidden,false);assert.match(state.status.textContent,/unavailable/);
});
test('return URLs cannot point off-site or back into automatic checkout',()=>{
 for(const url of ['https://evil.example','//evil.example','/signup','/atelier-v2/learn.html?buy=video'])assert.equal(funnel.safeReturn(url),'/atelier-v2/free-prompts-workflows.html#course-offer');
 assert.throws(()=>funnel.signupURL('https://evil.example',offer));assert.throws(()=>funnel.checkoutURL('unknown',offer));
});
test('all three sales entry pages contain a static course offer and price',()=>{
 for(const name of ['ocean-eyes-halloween','free-ai-tutorial','free-prompts-workflows']){
  const html=fs.readFileSync(require.resolve('../atelier-v2/'+name+'.html'),'utf8');
  assert(html.includes('class="course-preview"'));assert(html.includes('Get the course · ₦9,900'));
  assert(html.indexOf('course-funnel.js')<html.indexOf('fuse-shell.js'));
  assert(html.includes('AI generation credits are purchased separately.'));
 }
});
