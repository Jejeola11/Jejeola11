(() => {'use strict';
const $=id=>document.getElementById(id);let sb;
async function boot(){
  try{
    sb=await Fuse.client();
    const{data,error}=await sb.auth.getUser();
    if(error||!data.user)throw Error('Please sign in from Home to open your profile.');
    $('email').textContent=data.user.email;
    $('accountContent').hidden=false;
    $('accountStatus').textContent='';
    await Fuse.balance();
    $('operations').hidden=(data.user.email||'').trim().toLowerCase()!=='riadigitals0@gmail.com';
  }catch(e){$('accountStatus').textContent=e.message}
}
$('passwordForm').onsubmit=async e=>{
  e.preventDefault();
  if($('newPassword').value!==$('confirmPassword').value){$('passwordStatus').textContent='Passwords do not match.';return}
  $('savePassword').disabled=true;
  try{
    const{error}=await sb.auth.updateUser({password:$('newPassword').value});
    if(error)throw error;
    $('passwordForm').reset();
    $('passwordStatus').textContent='Password changed.';
  }catch(err){$('passwordStatus').textContent=err.message}
  finally{$('savePassword').disabled=false}
};
$('signOut').onclick=async()=>{
  try{
    const{error}=await sb.auth.signOut();
    if(error)throw error;
    location.replace('home.html')
  }catch(e){$('accountStatus').textContent=e.message}
};
boot();
})();