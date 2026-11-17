(()=>{'use strict';
const form=document.getElementById('payoutForm');
if(!form)return;
const bank=form.elements.bank_code,number=form.elements.account_number,name=form.elements.account_name;
const status=document.getElementById('payoutStatus'),save=document.getElementById('savePayout'),retry=document.getElementById('retryPayout');
let version=0,timer,verified='',loading=false,saving=false;
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
 if(loading||bank.options.length>1)return;loading=true;bank.disabled=true;status.textContent='Loading supported banks…';
 try{const result=await Fuse.api('payout-account',{action:'banks'});
  for(const item of result.banks){const option=document.createElement('option');option.value=item.code;option.textContent=item.name;bank.append(option);}
  status.textContent='Choose your bank and enter your account number.';
 }catch(err){status.textContent=err.message||'Could not load banks. Please try again.';retry.hidden=false;}
 finally{loading=false;bank.disabled=saving;}
}
bank.onchange=()=>{invalidate();resolve();};
number.oninput=()=>{number.value=number.value.replace(/\D/g,'').slice(0,10);invalidate();status.textContent='Enter your complete 10-digit account number.';if(number.value.length===10)timer=setTimeout(resolve,400);};
retry.onclick=()=>bank.options.length>1?resolve():loadBanks();
document.getElementById('setPayout').addEventListener('click',()=>{loadBanks();});
form.onsubmit=async event=>{
 event.preventDefault();if(saving)return;
 if(!verified||verified!==key()){await resolve();return;}
 saving=true;save.disabled=true;bank.disabled=true;number.readOnly=true;status.textContent='Verifying and saving your payout account…';
 try{
  const result=await Fuse.api('payout-account',{action:'save',bank_code:bank.value,account_number:number.value});
  name.value=result.account_name;document.getElementById('payoutSummary').textContent=result.bank_name+' · ••••'+number.value.slice(-4);
  status.textContent='Verified payout account saved.';
 }catch(err){status.textContent=err.message||'Could not save your payout account. Please try again.';}
 finally{saving=false;bank.disabled=false;number.readOnly=false;save.disabled=verified!==key();}
};
})();
