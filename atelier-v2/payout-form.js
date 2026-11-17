(()=>{'use strict';
const form=document.getElementById('payoutForm');
if(!form)return;
const bank=form.elements.bank_code,number=form.elements.account_number,name=form.elements.account_name;
const status=document.getElementById('payoutStatus'),save=document.getElementById('savePayout'),retry=document.getElementById('retryPayout');
const toggle=document.getElementById('bankPickerToggle'),panel=document.getElementById('bankPickerPanel'),search=document.getElementById('bankSearch'),results=document.getElementById('bankResults'),searchStatus=document.getElementById('bankSearchStatus');
let version=0,timer,verified='',loading=false,saving=false,banksLoaded=false;
const normalize=value=>value.toLowerCase().replace(/[^a-z0-9]/g,'');
function renderBanks(){
 const query=normalize(search.value);results.replaceChildren();
 const matches=[...bank.options].filter(option=>option.value&&normalize(option.textContent).includes(query));
 for(const option of matches){const button=document.createElement('button');button.type='button';button.textContent=option.textContent;button.setAttribute('aria-pressed',String(option.value===bank.value));button.onclick=()=>{bank.value=option.value;toggle.firstChild.textContent=option.textContent+' ';panel.hidden=true;toggle.setAttribute('aria-expanded','false');bank.dispatchEvent(new Event('change'));toggle.focus();};results.append(button);}
 searchStatus.textContent=loading?'Loading banks…':!banksLoaded?'Banks could not load. Use Try again below.':matches.length?matches.length+' bank'+(matches.length===1?'':'s')+' found':'No matching bank. Try another name.';
}
toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden){search.value='';renderBanks();search.focus();loadBanks();}};
search.oninput=renderBanks;
panel.addEventListener('keydown',event=>{if(event.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}else if(event.key==='ArrowDown'&&event.target===search){event.preventDefault();results.querySelector('button')?.focus();}});
const key=()=>bank.value+':'+number.value;
function invalidate(){version++;clearTimeout(timer);verified='';name.value='';save.disabled=true;retry.hidden=true;}
async function resolve(){
 invalidate();
 if(!bank.value||!/^\d{10}$/.test(number.value)){status.textContent='Choose your bank and enter your 10-digit account number.';return;}
 const current=version,details=key();status.textContent='Verifying account name…';name.placeholder='Checking with your bank…';
 try{
  const result=await Fuse.api('payout-account',{action:'resolve',bank_code:bank.value,account_number:number.value});
  if(current!==version||details!==key())return;
  name.value=result.account_name;verified=details;save.disabled=false;status.textContent='Account verified. Check the name before saving.';
 }catch(err){if(current!==version)return;status.textContent=err.message||'Could not verify this account. Please try again.';retry.hidden=false;}
 finally{if(current===version)name.placeholder='Filled automatically after verification';}
}
async function loadBanks(){
 if(loading||banksLoaded)return;loading=true;bank.disabled=true;renderBanks();status.textContent='Loading supported banks…';
 try{const result=await Fuse.api('payout-account',{action:'banks'});
  for(const item of result.banks){const option=document.createElement('option');option.value=item.code;option.textContent=item.name;bank.append(option);}
  banksLoaded=true;renderBanks();status.textContent='Choose your bank and enter your account number.';
 }catch(err){status.textContent=err.message||'Could not load banks. Please try again.';retry.hidden=false;}
 finally{loading=false;bank.disabled=saving;renderBanks();}
}
bank.onchange=()=>{invalidate();resolve();};
number.oninput=()=>{number.value=number.value.replace(/\D/g,'').slice(0,10);invalidate();status.textContent='Enter your complete 10-digit account number.';if(number.value.length===10)timer=setTimeout(resolve,400);};
retry.onclick=()=>bank.options.length>1?resolve():loadBanks();
document.getElementById('setPayout').addEventListener('click',()=>{loadBanks();});
form.onsubmit=async event=>{
 event.preventDefault();if(saving)return;
 if(!verified||verified!==key()){await resolve();return;}
 saving=true;save.disabled=true;bank.disabled=true;toggle.disabled=true;panel.hidden=true;toggle.setAttribute('aria-expanded','false');number.readOnly=true;status.textContent='Verifying and saving your payout account…';
 try{
  const result=await Fuse.api('payout-account',{action:'save',bank_code:bank.value,account_number:number.value});
  name.value=result.account_name;document.getElementById('payoutSummary').textContent=result.bank_name+' · ••••'+number.value.slice(-4);
  status.textContent='Verified payout account saved.';
 }catch(err){status.textContent=err.message||'Could not save your payout account. Please try again.';}
 finally{saving=false;bank.disabled=false;toggle.disabled=false;number.readOnly=false;save.disabled=verified!==key();}
};
})();
