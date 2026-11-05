(()=>{
  'use strict';
  const access=document.getElementById('courseAccess');
  const wrap=document.getElementById('courseModules');
  const list=document.getElementById('moduleList');
  (async()=>{
    try{
      const client=await Fuse.client();
      const {data}=await client.auth.getSession();
      const token=data?.session?.access_token;
      if(!token){access.innerHTML='<p>Sign in to check access to this course.</p><a href="/signup/">Sign in</a>';return;}
      const response=await fetch('/api/influencer-course',{headers:{authorization:'Bearer '+token},cache:'no-store'});
      const course=await response.json();
      if(!response.ok){access.textContent=course.error||'Could not open this course.';return;}
      access.hidden=true;
      course.modules.forEach(module=>{
        const card=document.createElement('article');card.className='module';
        const number=document.createElement('small');number.textContent='MODULE '+String(module.number).padStart(2,'0');
        const title=document.createElement('h3');title.textContent=module.title;
        const state=document.createElement('div');state.className='placeholder';state.textContent=module.status;
        card.append(number,title,state);list.append(card);
      });
      wrap.hidden=false;
    }catch{access.textContent='Could not check course access. Please try again.';}
  })();
})();
