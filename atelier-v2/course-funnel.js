(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else {
    root.FuseCourseFunnel=api;
    const enhance=()=>{
      if(!api.isPublicPage(location.pathname,location.search))return;
      for(const link of document.querySelectorAll('a[href]')){
        const url=new URL(link.href,location.href);
        if(url.origin!==location.origin||!url.pathname.endsWith('/learn.html')||url.searchParams.get('buy')!=='video')continue;
        link.href=api.checkoutURL('video',url.searchParams.get('return')||location.pathname+location.search+location.hash,location.search);
      }
    };
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance,{once:true});else enhance();
  }
})(typeof window!=='undefined'?window:globalThis,()=>{
  'use strict';
  const courses=new Set(['video','design','landing','money','challenge','ebook','influencer']);
  const publicFiles=new Set(['ocean-eyes-halloween.html','free-ai-tutorial.html','free-prompts-workflows.html','realistic-images.html']);
  function isPublicPage(pathname,search=''){
    const file=pathname.split('/').pop().toLowerCase();
    const q=new URLSearchParams(search);
    return publicFiles.has(file)||(file==='learn.html'&&(courses.has(q.get('buy'))||q.get('payment')==='success'&&courses.has(q.get('course'))));
  }
  function safeReturn(value){
    try{
      const url=new URL(value,'https://fuseatelier.com');
      if(url.origin!=='https://fuseatelier.com'||!url.pathname.startsWith('/atelier-v2/')||url.pathname.endsWith('/login.html'))throw Error();
      if(url.pathname.endsWith('/learn.html')&&url.searchParams.has('buy'))throw Error();
      return url.pathname+url.search+url.hash;
    }catch{return '/atelier-v2/free-prompts-workflows.html#course-offer';}
  }
  function checkoutURL(course,returnTo,search=''){
    if(!courses.has(course))throw Error('Choose a supported course.');
    const q=new URLSearchParams({buy:course,return:safeReturn(returnTo)});
    const ref=new URLSearchParams(search).get('ref');
    if(ref&&/^[a-z0-9-]{5,80}$/i.test(ref))q.set('ref',ref);
    return '/atelier-v2/learn.html?'+q;
  }
  function signupURL(next,returnTo,search=''){
    const url=new URL(next,'https://fuseatelier.com');
    if(url.origin!=='https://fuseatelier.com'||!url.pathname.startsWith('/atelier-v2/'))throw Error('Invalid destination.');
    const q=new URLSearchParams({next:url.pathname+url.search+url.hash,return:safeReturn(returnTo)});
    const ref=new URLSearchParams(search).get('ref');
    if(ref&&/^[a-z0-9-]{5,80}$/i.test(ref))q.set('ref',ref);
    return '/signup?'+q;
  }
  return Object.freeze({isPublicPage,safeReturn,checkoutURL,signupURL});
});
