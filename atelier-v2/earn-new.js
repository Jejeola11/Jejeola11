(()=>{'use strict';
const $=id=>document.getElementById(id);const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'₦'+Number(n||0).toLocaleString('en-NG');let data;
const status=s=>{$('earnStatus').textContent=s};
const deadline=s=>new Date(s).toLocaleString('en-NG',{dateStyle:'medium',timeStyle:'short'});
async function call(body){const r=await Fuse.api('fuse-earn',body);return r}
let referralLink='';
async function refresh(){data=await call();referralLink=data.code?'https://fuseatelier.com/atelier-v2/join.html?ref='+encodeURIComponent(data.code):'';if($('affiliateModalLink'))$('affiliateModalLink').value=referralLink||'Your link is unavailable';$('copyAffiliateLink').disabled=!referralLink;}
const CREDIT_PACK_PRICES=[1250,6250,12500,25000,62500,125000];
const ACADEMY_PRICE=9900,ACADEMY_COMMISSION=ACADEMY_PRICE*.5;
const calcInputs=['referralsPerMonth','averageCreditPack','averageCourse'].map($);
function syncRange(input,dotCount){const shell=input.closest('[data-range-shell]'),min=Number(input.min),max=Number(input.max),value=Number(input.value),progress=max===min?0:(value-min)/(max-min);shell.style.setProperty('--progress',(progress*100)+'%');const dots=shell.querySelector('.range-dots');if(Number(dots.dataset.count)!==dotCount){dots.innerHTML=Array.from({length:dotCount},()=>'<i></i>').join('');dots.dataset.count=dotCount;}}
function renderCalculator(){const referrals=Number(calcInputs[0].value),packIndex=Number(calcInputs[1].value);calcInputs[2].max=String(referrals);if(Number(calcInputs[2].value)>referrals)calcInputs[2].value=String(referrals);const courseBuyers=Number(calcInputs[2].value),pack=CREDIT_PACK_PRICES[packIndex];$('referralsOutput').textContent=referrals;$('creditPackOutput').textContent=pack.toLocaleString('en-NG');$('courseOutput').textContent=courseBuyers.toLocaleString('en-NG');const creditCommission=referrals*pack*.05,courseCommission=courseBuyers*ACADEMY_COMMISSION,total=Math.round(creditCommission+courseCommission);$('calcTotal').textContent=money(total);$('calcChartTotal').textContent=money(total);const highest=Math.max(creditCommission,courseCommission,1);$('calcBars').innerHTML=[creditCommission,courseCommission].map(amount=>'<i style="height:'+Math.max(4,amount/highest*100)+'%;grid-column:span 6" aria-hidden="true"></i>').join('');$('calcBars').setAttribute('aria-label','Estimated monthly commission: '+money(total));syncRange(calcInputs[0],11);syncRange(calcInputs[1],6);syncRange(calcInputs[2],11);}
calcInputs.forEach(el=>el.addEventListener('input',renderCalculator));renderCalculator();
const affiliateModal=$('affiliateModal'),affiliateBackdrop=$('affiliateModalBackdrop'),affiliateModalLink=$('affiliateModalLink');let affiliateModalFocus=null;
function setAffiliateModal(open){affiliateModal.hidden=!open;affiliateBackdrop.hidden=!open;document.body.classList.toggle('affiliate-modal-open',open);if(open){affiliateModalFocus=document.activeElement;affiliateModalLink.value=referralLink||'Loading your link…';$('affiliateModalClose').focus()}else affiliateModalFocus?.focus()}
document.addEventListener('click',e=>{const trigger=e.target.closest('a[href="#my-link"]');if(!trigger||trigger.id==='affiliateDashboardButton')return;e.preventDefault();setAffiliateModal(true)});
$('affiliateModalClose').addEventListener('click',()=>setAffiliateModal(false));affiliateBackdrop.addEventListener('click',()=>setAffiliateModal(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!affiliateModal.hidden)setAffiliateModal(false)});
$('copyAffiliateLink').addEventListener('click',async()=>{const button=$('copyAffiliateLink'),label=button.querySelector('span');try{await navigator.clipboard.writeText(affiliateModalLink.value);label.textContent='Copied';setTimeout(()=>label.textContent='Copy',1500)}catch{affiliateModalLink.select();label.textContent='Select link'}});
$('affiliateDashboardButton').addEventListener('click',()=>setAffiliateModal(false));

window.addEventListener('DOMContentLoaded',async()=>{try{const session=await Fuse.session();window.__fuseEarnUser=session.user.id;await refresh()}catch(e){status(e.message||'Could not load Fuse Earn.')} });
})();
