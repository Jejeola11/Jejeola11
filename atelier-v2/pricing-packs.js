(async function(){
 'use strict';
 const root=document.getElementById('packs'),status=document.getElementById('status');
 try{
  const response=await fetch('/api/credit-pricing');if(!response.ok)throw Error('Unavailable');
  const data=await response.json();if(!Array.isArray(data.packs))throw Error('Invalid catalogue');
  for(const pack of data.packs){
   const card=document.createElement('article');card.className='pack';
   for(const [tag,cls,text] of [['h2','chrome',pack.label],['p','price','₦'+Number(pack.amount_naira).toLocaleString('en-NG')],['p','credits',pack.credits+' credits'],['p','note',pack.note]]){const el=document.createElement(tag);el.className=cls;el.textContent=text;card.append(el)}
   let link=null;try{const u=new URL(pack.checkout);if(data.enabled&&u.protocol==='https:'&&(u.hostname==='nestuge.com'||u.hostname.endsWith('.nestuge.com')))link=u.href}catch{}
   const button=document.createElement(link?'a':'button');button.className='buy';button.textContent=link?'Get '+pack.label:'Checkout coming soon';if(link){button.href=link;button.target='_blank';button.rel='noopener'}else button.disabled=true;card.append(button);root.append(card);
  }
  status.textContent=data.enabled?'':'New credit packs are being prepared. Payments are not open yet.';
 }catch{status.textContent='Credit packs could not load. Please refresh in a moment.'}
})();
