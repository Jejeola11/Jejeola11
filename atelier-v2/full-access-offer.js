(()=>{
'use strict';
const END=new Date('2026-11-09T00:00:00+01:00').getTime();
const allowedPages=new Set(['home.html','learn.html','studio.html','create.html','clients.html','earn.html']);
const page=location.pathname==='/'?'home.html':location.pathname.split('/').pop();
if(!allowedPages.has(page)||Date.now()>=END)return;
const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href='/atelier-v2/full-access-offer.css?v=1';document.head.append(sheet);
const image='https://res.cloudinary.com/bzw55wh2/image/upload/v1793623939/fuse-atelier/offers/full-access-november-2026.webp';
const REPEAT_MS=30*60*1000;
let timer,dialog,previousFocus,owner=null,opening=false,nextDue=Date.now()+5000;
async function eligibility(){
 const sb=await Fuse.client();const {data,error}=await sb.auth.getSession();
 if(error||!data?.session)return null;
 const user=data.session.user;
 // Owner preview changes ad visibility only; payment and entitlement checks remain server-side.
 if(String(user.email||'').trim().toLowerCase()==='riadigitals0@gmail.com')return user;
 const [p,u]=await Promise.all([sb.from('profiles').select('is_admin').eq('id',user.id).single(),sb.from('module_unlocks').select('module_key').eq('user_id',user.id)]);
 if(p.error||u.error||p.data?.is_admin)return null;
 const keys=new Set((u.data||[]).map(r=>r.module_key));
 if(['atelier-full','atelier-empire','atelier-creator','atelier-starter'].some(k=>keys.has(k)))return null;
 return user;
}
const svg=path=>'<svg viewBox="0 0 24 24" aria-hidden="true">'+path+'</svg>';
function close(){if(dialog?.open)dialog.close();previousFocus?.focus?.()}
function build(){
 dialog=document.createElement('dialog');dialog.className='fuse-offer';dialog.setAttribute('aria-labelledby','fuseOfferTitle');
 dialog.innerHTML=`<header class="fuse-offer-head"><h2 id="fuseOfferTitle">🎁 Special Offer</h2><button type="button" class="fuse-offer-close" aria-label="Close special offer" autofocus>×</button></header>
 <img class="fuse-offer-art" src="${image}" width="1200" height="900" alt="₦25,900 for Full Access with 55 Fuse credits. November 2nd–November 8th.">
 <ul class="fuse-offer-benefits">
 <li><span class="fuse-offer-icon">${svg('<path d="m2 9 10-5 10 5-10 5zM5 11v7q7 5 14 0v-7M22 9v8"/>')}</span><div><strong>Unlock all Academy courses</strong><p>Learn AI video, AI UGC, design, landing pages and more.</p></div></li>
 <li><span class="fuse-offer-icon lime">${svg('<rect x="4" y="7" width="16" height="14" rx="4"/><path d="M12 3v4M2 12v5M22 12v5M8 17h8"/><circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/>')}</span><div><strong>Access to all agents and models</strong><p>Create images, video, pages, commercials and more.</p></div></li>
 <li><span class="fuse-offer-icon yellow">${svg('<path d="m13 2-9 12h7l-1 8 10-13h-8z"/>')}</span><div><strong>55 credits included</strong><p>Start creating immediately with your credits.</p></div></li></ul>
 <ul class="fuse-offer-checks"><li>One-time payment. No monthly subscription.</li><li>Top up whenever you need more credits.</li><li>Learn, practise and build work you can sell.</li></ul>
 <div class="fuse-offer-value"><strong>Why you should get this now:</strong>Save ₦33,500 versus buying the six current Academy offers separately (₦59,400), plus get 55 credits. Get full access in one payment before this offer ends November 8th.</div>
 <button type="button" class="fuse-offer-cta">Get Full Access For ₦25,900</button><span class="fuse-offer-lock">${svg('<path d="M2 10 10 2h8l4 4v8l-8 8L2 10zm13-4a2 2 0 1 0 4 0 2 2 0 0 0-4 0"/>')}Lock Your Special Offer</span><p class="fuse-offer-status" role="status" aria-live="polite"></p><button class="fuse-offer-skip" type="button">Skip The Special Offer</button>`;
 document.body.append(dialog);
 dialog.querySelector('.fuse-offer-close').onclick=close;dialog.querySelector('.fuse-offer-skip').onclick=close;
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close()}});
 dialog.addEventListener('close',()=>previousFocus?.focus?.());
 dialog.querySelector('.fuse-offer-cta').onclick=async function(){
  const status=dialog.querySelector('.fuse-offer-status');this.disabled=true;status.textContent='Opening secure Paystack checkout…';
  try{
   if(Date.now()>=END)throw Error('This promotion has ended. Visit Pricing for available offers.');
   const user=await eligibility();if(!user||user.id!==owner)throw Error('Your account access changed. Please reload the page.');
   const out=await Fuse.api('paystack-init',{pack:'fuse-creator-pass'});
   const url=new URL(out.authorization_url);if(url.protocol!=='https:'||url.hostname!=='checkout.paystack.com')throw Error('Checkout could not be opened. Please try again from Pricing.');
   location.assign(url.href);
  }catch(error){status.textContent=error.message||'Could not start checkout. Please try again.';this.disabled=false;}
 };
}
async function show(){
 if(opening||Date.now()<nextDue||document.hidden||Date.now()>=END||document.querySelector('dialog[open],[aria-modal="true"],#accountMenu:not([hidden]),[aria-busy="true"]'))return;
 opening=true;
 try{
  const user=await eligibility();
  // Recheck eligibility at each appearance. Reloads start a fresh 5-second delay.
  nextDue=Date.now()+REPEAT_MS;
  if(!user||document.hidden)return;
  if(!dialog)build();owner=user.id;previousFocus=document.activeElement;dialog.showModal();
 }catch{nextDue=Date.now()+5000}
 finally{opening=false}
}
timer=setTimeout(show,5000);
setInterval(show,5000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)show()});
Fuse.client().then(sb=>sb.auth.onAuthStateChange((event,session)=>{
 if(event==='SIGNED_OUT'){close();owner=null;nextDue=Date.now()+5000}
 if(event==='SIGNED_IN'&&session?.user?.id!==owner){clearTimeout(timer);nextDue=Date.now()+5000;timer=setTimeout(show,5000)}
})).catch(()=>{});
})();
