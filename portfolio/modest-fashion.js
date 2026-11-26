const hero=document.querySelector('#hero-video');
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)hero.play().catch(()=>{});
document.addEventListener('play',event=>{
 if(!(event.target instanceof HTMLVideoElement))return;
 for(const video of document.querySelectorAll('video'))if(video!==event.target)video.pause();
},true);
const form=document.querySelector('#brief-form');
const status=document.querySelector('#brief-status');
for(const link of document.querySelectorAll('[data-package]')){
 link.addEventListener('click',()=>{form.elements.package.value=link.dataset.package;});
}
let requestId=crypto.randomUUID();
form.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('button');
 if(button.disabled)return;
 button.disabled=true;
 status.textContent='Sending your brief…';
 try{
  const response=await fetch('/api/portfolio-brief',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...Object.fromEntries(new FormData(form)),requestId}),signal:AbortSignal.timeout(25000)});
  const result=await response.json();
  if(!response.ok||!result.success)throw Error(result.error||'Delivery was unsuccessful.');
  status.textContent='Your brief was sent. I’ll reply by email.';
  form.reset();
  requestId=crypto.randomUUID();
 }catch(error){status.textContent=error.message+' You can also use the email link.';}
 finally{button.disabled=false;}
});