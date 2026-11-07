(function(w,d){
  'use strict';
  if(w.__fuseFreePixelLoaded)return;
  w.__fuseFreePixelLoaded=true;
  // Existing Fuse Atelier Pixel ID, reused for the free signup funnel.
  !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=true;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=true;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
  w.fbq('init','1865426751496318');
  w.fbq('track','PageView');
  w.FuseFreePixel=Object.freeze({
    trackStart:()=>w.fbq('trackCustom','FreeSignupStarted',{funnel:'free-prompts-workflows'}),
    trackClick:()=>w.fbq('trackCustom','FreeSignupClick',{funnel:'free-prompts-workflows'}),
    trackComplete:()=>w.fbq('track','CompleteRegistration',{content_name:'Fuse Atelier Free Prompts & Workflows',status:'complete'})
  });
})(window,document);
