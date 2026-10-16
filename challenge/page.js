(()=>{'use strict';
const link=document.getElementById('enrol-link');
const status=document.getElementById('enrol-status');
const counter=document.getElementById('deadline-countdown');
const deadline=new Date('2026-10-18T23:59:59+01:00').getTime();
function update(){
 const remaining=Math.max(0,deadline-Date.now());
 const closed=remaining===0;
 if(counter){
  if(closed)counter.textContent='This cohort has closed';
  else {const days=Math.floor(remaining/86400000),hours=Math.floor(remaining/3600000)%24,minutes=Math.floor(remaining/60000)%60,seconds=Math.floor(remaining/1000)%60;counter.textContent=`${days}d ${String(hours).padStart(2,'0')}h ${String(minutes).padStart(2,'0')}m ${String(seconds).padStart(2,'0')}s`;}
 }
 const selected=document.querySelector('input[name="payment"]:checked');
 const split=selected&&selected.value==='split';
 const message=closed?'Hi Ria, I saw the 14-Day AI Client Challenge. The October enrolment deadline has passed. Please let me know about the next available cohort.':`Hi Ria, I’d like to join the 14-Day AI Client Challenge starting October 19 and ${split?'pay ₦7,500 now and ₦7,500 by October 18':'pay ₦15,000 in full'}. Please confirm availability, payment instructions, the support schedule, access duration and programme terms.`;
 link.href='https://wa.me/2349044558101?text='+encodeURIComponent(message);
 link.textContent=closed?'Ask about the next cohort ↗':'Join via WhatsApp ↗';
 if(closed){status.textContent='Registration for the October 19 cohort has closed. Ask Ria about the next cohort before making payment.';document.querySelectorAll('input[name="payment"]').forEach(x=>x.disabled=true);const mobile=document.querySelector('.mobile-bar .button');if(mobile)mobile.textContent='Next cohort ↗';}
}
document.querySelectorAll('input[name="payment"]').forEach(x=>x.addEventListener('change',update));update();setInterval(update,1000);
})();
