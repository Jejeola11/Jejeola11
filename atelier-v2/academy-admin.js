(()=>{
'use strict';
const core=document.createElement('script');
core.src='/atelier-v2/academy-admin-core.js?v=20260903-admin-complete';
core.onload=()=>{const extras=document.createElement('script');extras.src='/atelier-v2/academy-admin-extras.js?v=20260903-admin-complete';document.body.appendChild(extras)};
core.onerror=()=>{const m=document.getElementById('loginMessage');if(m){m.textContent='Could not load Academy Admin. Refresh and try again.';m.classList.remove('hidden')}};
document.body.appendChild(core);
})();
