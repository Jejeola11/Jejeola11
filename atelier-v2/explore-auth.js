(function(root,create){
  if(typeof module==='object'&&module.exports)module.exports=create;
  else root.FuseExplore=create(root);
})(typeof window!=='undefined'?window:globalThis,function(root){
  'use strict';
  const adapters=new Map(),TTL=2*60*60*1000,doc=root.document;
  const path=()=>root.location.pathname;
  const current=()=>path()+root.location.search+root.location.hash;
  function localURL(value,fallback=current()){
    try{const u=new URL(value,root.location.origin);if(u.origin!==root.location.origin||/^\/(?:signup|login)(?:\/|$)/.test(u.pathname)||u.pathname.startsWith('/start/auth/'))return fallback;return u.pathname+u.search+u.hash}catch{return fallback}
  }
  function authURL(next=current(),returnTo=current()){
    const q=new URLSearchParams({next:localURL(next),return:localURL(returnTo)});
    const ref=new URLSearchParams(root.location.search).get('ref');if(ref&&/^[a-z0-9-]{5,80}$/i.test(ref))q.set('ref',ref);
    return '/signup?'+q;
  }
  async function session(client){
    try{client ||= root.__fuseClient || await root.Fuse?.client();if(!client)return null;const {data,error}=await client.auth.getSession();if(error)throw error;return data?.session||null}catch{return null}
  }
  function database(){
    return new Promise((resolve,reject)=>{
      if(!root.indexedDB)return reject(Error('Local file storage is unavailable.'));
      const timeout=setTimeout(()=>reject(Error('Local draft storage took too long.')),3000);
      const req=root.indexedDB.open('fuse-guest-drafts',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('drafts'))req.result.createObjectStore('drafts')};
      req.onsuccess=()=>{clearTimeout(timeout);resolve(req.result)};req.onerror=()=>{clearTimeout(timeout);reject(req.error)};req.onblocked=()=>{clearTimeout(timeout);reject(Error('Local draft storage is blocked.'))};
    });
  }
  async function store(op,key,value){
    const db=await database();try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts',op==='get'?'readonly':'readwrite'),table=tx.objectStore('drafts');
      const req=op==='put'?table.put(value,key):op==='delete'?table.delete(key):table.get(key);
      tx.oncomplete=()=>resolve(req.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('Draft save interrupted.'));
    })}finally{db.close()}
  }
  const key=name=>path()+':'+name;
  async function saveDraft(name){
    const adapter=adapters.get(name);if(!adapter)return true;
    const record={created:Date.now(),data:await adapter.capture()};
    // Always save text/settings separately; IndexedDB additionally preserves File objects.
    try{root.sessionStorage.setItem('fuse-draft:'+key(name),JSON.stringify(record,(_k,v)=>typeof Blob!=='undefined'&&v instanceof Blob?null:v))}catch{}
    try{await store('put',key(name),record);return true}catch{return false}
  }
  async function registerDraft(name,adapter){
    adapters.set(name,adapter);let record;
    try{record=await store('get',key(name))}catch{}
    if(!record)try{record=JSON.parse(root.sessionStorage.getItem('fuse-draft:'+key(name))||'null')}catch{}
    if(!record)return;
    if(Date.now()-record.created<TTL&&record.created<=Date.now())await adapter.restore(record.data);
    try{root.sessionStorage.removeItem('fuse-draft:'+key(name));await store('delete',key(name))}catch{}
  }
  let dialog,previousFocus;
  function close(){if(!dialog)return;if(typeof dialog.close==='function')dialog.close();else dialog.removeAttribute('open');previousFocus?.focus();}
  function prompt(options,filesSaved){
    if(!doc)return;
    if(!dialog){
      dialog=doc.createElement('dialog');dialog.className='fuse-account-prompt';dialog.setAttribute('aria-labelledby','fuse-account-title');
      dialog.innerHTML='<button type="button" data-close aria-label="Keep exploring">×</button><p class="fuse-account-kicker">YOUR FREE FUSE ACCOUNT</p><h2 id="fuse-account-title">Keep creating with Fuse</h2><p data-reason></p><p data-draft></p><button type="button" data-continue>Continue to signup / login</button><button type="button" data-cancel>Keep exploring</button><small>Signing in does not start a paid generation or purchase.</small>';
      doc.body.append(dialog);dialog.querySelector('[data-close]').onclick=dialog.querySelector('[data-cancel]').onclick=close;
      dialog.addEventListener('click',e=>{if(e.target===dialog)close()});
    }
    previousFocus=doc.activeElement;
    dialog.querySelector('[data-reason]').textContent=options.reason||'Create an account to keep this work in your own workspace.';
    dialog.querySelector('[data-draft]').textContent=options.draft?(filesSaved?'Your prompt, settings and references are saved on this device for your return.':'Your text and settings are saved where this browser allows. You may need to reattach files after signing in.'):'';
    dialog.querySelector('[data-continue]').onclick=()=>{options.onContinue?.();root.location.assign(authURL(options.next||current(),options.returnTo||current()))};
    if(!dialog.open){if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','')}
  }
  async function requireAccount(options={}){
    const user=await session(options.client);if(user)return user;
    let saved=true;if(options.draft)saved=await saveDraft(options.draft);
    prompt(options,saved);return null;
  }
  function preview(element,{title,description,action='Get started',reason=description}={}){
    if(!element||!doc)return;
    const panel=doc.createElement('section');panel.className='fuse-guest-preview';
    const h=doc.createElement('h1');h.textContent=title;
    const p=doc.createElement('p');p.textContent=description;
    const b=doc.createElement('button');b.type='button';b.textContent=action;b.onclick=async()=>{if(await requireAccount({reason}))root.location.reload()};
    const a=doc.createElement('a');a.href='/atelier-v2/free-prompts-workflows.html';a.textContent='Explore free tutorials';
    panel.append(h,p,b,a);element.replaceChildren(panel);
  }
  if(doc){const css=doc.createElement('link');css.rel='stylesheet';css.href='/atelier-v2/explore-auth.css?v=1';doc.head.append(css);}
  return Object.freeze({authURL,session,requireAccount,registerDraft,saveDraft,preview});
});
