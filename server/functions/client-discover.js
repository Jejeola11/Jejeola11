// POST /api/client-discover
// Researches broadly, verifies a current reason to reach out, enriches public contact data,
// ranks the strongest five and stores the evidence used for every recommendation.
const { admin, getUser, json } = require('./_supabase');
function clean(v,max=1000){return typeof v==='string'?v.trim().slice(0,max):''}
function domainFrom(url){try{return new URL(url).hostname.replace(/^www\./,'')}catch{return''}}
function scoreBase(p){
  let s=20;
  if(p.websiteUri)s+=10;
  if(p.nationalPhoneNumber)s+=10;
  if(Number(p.userRatingCount||0)>=20)s+=5;
  if(Number(p.userRatingCount||0)>=100)s+=5;
  return s;
}
function starterPrice(skill){
  const s=String(skill||'').toLowerCase();
  if(s.includes('landing')||s.includes('page')||s.includes('website'))return {currency:'USD',amount:250};
  if(s.includes('video')||s.includes('ugc')||s.includes('ad'))return {currency:'USD',amount:150};
  if(s.includes('brand'))return {currency:'USD',amount:300};
  if(s.includes('google business')||s.includes('profile'))return {currency:'USD',amount:200};
  return {currency:'USD',amount:100};
}
function bestContact(x){
  if(x.contact&&x.contact.email)return 'Email';
  if(x.contact&&x.contact.linkedin)return 'LinkedIn';
  if(x.place&&x.place.nationalPhoneNumber)return 'WhatsApp / phone';
  return x.place&&x.place.websiteUri?'Website contact route':'Not found';
}
function askFirstFor(x,skill){
  const who=x.contact&&x.contact.name?x.contact.name:x.name;
  const now=x.whyNow||'your current campaign';
  const gap=x.gap||('a focused '+skill+' idea that fits what you are promoting now');
  return 'Hi '+who+', I came across '+now+'. I noticed '+gap.charAt(0).toLowerCase()+gap.slice(1)+' I have an idea for '+skill+' that could make that campaign/customer journey clearer. Would you be open to seeing a quick concept?';
}
function serviceGap(skill,p,page){
  const k=String(skill||'').toLowerCase();
  if((k.includes('landing')||k.includes('page')||k.includes('website'))&&!p.websiteUri)return 'No website is listed on the Google Business Profile.';
  if((k.includes('landing')||k.includes('page')||k.includes('website'))&&page&&page.performance!=null&&page.performance<60)return 'The saved website scored '+page.performance+'/100 on the mobile performance check.';
  if(k.includes('google business')||k.includes('profile')){
    if(Number.isFinite(Number(p.rating))&&Number(p.rating)<4.4)return 'Google rating is '+Number(p.rating).toFixed(1)+' with '+Number(p.userRatingCount||0)+' reviews.';
    if(Number(p.userRatingCount||0)<50)return 'Google profile has '+Number(p.userRatingCount||0)+' reviews, creating a factual reputation-growth opportunity.';
  }
  return '';
}
async function currentSignal(name,location,key){
  const q='"'+name+'" '+location+' (launch OR launching OR new OR opening OR hiring OR event OR campaign OR offer OR sale OR partnership OR expansion)';
  const u=new URL('https://serpapi.com/search');u.searchParams.set('engine','google');u.searchParams.set('q',q);u.searchParams.set('api_key',key);u.searchParams.set('num','6');u.searchParams.set('tbs','qdr:m6');u.searchParams.set('location',location);
  const r=await fetch(u);const d=await r.json().catch(()=>({}));if(!r.ok)return null;
  const rows=Array.isArray(d.organic_results)?d.organic_results:[];
  const hit=rows.find(x=>x&&x.link&&x.title&&String(x.snippet||'').length>20);
  if(!hit)return null;
  return {title:clean(hit.title,300),snippet:clean(hit.snippet,900),url:clean(hit.link,1200),date:clean(hit.date,120)};
}
async function hunter(domain,key){
  if(!domain||!key)return null;
  const u=new URL('https://api.hunter.io/v2/domain-search');u.searchParams.set('domain',domain);u.searchParams.set('api_key',key);u.searchParams.set('limit','10');
  const r=await fetch(u);const d=await r.json().catch(()=>({}));if(!r.ok)return null;
  const emails=Array.isArray(d&&d.data&&d.data.emails)?d.data.emails:[];
  const ranked=[...emails].sort((a,b)=>{const ta=String(a.position||'').toLowerCase(),tb=String(b.position||'').toLowerCase();const f=x=>/(founder|owner|ceo|chief|marketing|growth|brand)/.test(x)?2:0;return f(tb)-f(ta)});
  const p=ranked[0]||null;if(!p)return {email:'',name:'',title:'',linkedin:''};
  return {email:clean(p.value,320),name:clean([p.first_name,p.last_name].filter(Boolean).join(' '),220),title:clean(p.position,220),linkedin:clean(p.linkedin_url||p.linkedin||'',700),phone:clean(p.phone_number||'',120),sources:Array.isArray(p.sources)?p.sources.map(s=>({label:'Email source',url:clean(s.uri||'',1200)})).filter(x=>x.url):[]};
}
async function pageSpeed(url,key){
  if(!url||!key)return null;
  const u=new URL('https://www.googleapis.com/pagespeedonline/v5/runPagespeed');u.searchParams.set('url',url);u.searchParams.set('strategy','mobile');u.searchParams.set('category','performance');u.searchParams.set('key',key);
  const r=await fetch(u);const d=await r.json().catch(()=>({}));if(!r.ok)return null;
  const score=d&&d.lighthouseResult&&d.lighthouseResult.categories&&d.lighthouseResult.categories.performance&&d.lighthouseResult.categories.performance.score;
  const lcp=d&&d.lighthouseResult&&d.lighthouseResult.audits&&d.lighthouseResult.audits['largest-contentful-paint']&&d.lighthouseResult.audits['largest-contentful-paint'].numericValue;
  return {performance:Number.isFinite(Number(score))?Math.round(Number(score)*100):null,lcp_ms:Number.isFinite(Number(lcp))?Math.round(Number(lcp)):null};
}
async function enrich(place,skill,location,keys){
  const name=clean(place.displayName&&place.displayName.text,180)||'Business';
  const domain=domainFrom(place.websiteUri||'');
  const results=await Promise.all([currentSignal(name,location,keys.serp).catch(()=>null),hunter(domain,keys.hunter).catch(()=>null),pageSpeed(place.websiteUri||'',keys.pagespeed).catch(()=>null)]);
  const signal=results[0],contact=results[1],page=results[2];
  const gap=serviceGap(skill,place,page);
  const hasContact=!!(place.nationalPhoneNumber||(contact&&contact.email)||place.websiteUri);
  const whyNow=signal?(signal.title+(signal.snippet?' — '+signal.snippet:'')):'';
  const qualifies=!!signal&&hasContact;
  let score=scoreBase(place)+(signal?25:0)+(contact&&contact.email?12:0)+(contact&&contact.name?8:0)+(gap?15:0);
  score=Math.max(1,Math.min(100,score));
  const sources=[];
  if(place.googleMapsUri)sources.push({label:'Google Business Profile',url:place.googleMapsUri});
  if(signal&&signal.url)sources.push({label:'Current activity',url:signal.url});
  if(place.websiteUri)sources.push({label:'Website',url:place.websiteUri});
  if(contact&&Array.isArray(contact.sources))sources.push(...contact.sources.slice(0,4));
  return {place,name,domain,signal,contact,page,gap,whyNow,qualifies,score,sources};
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const skill=clean(body.skill,180),niche=clean(body.niche,140),location=clean(body.location,180);
    if(!skill||!niche||!location)return json(400,{error:'Choose your skill, niche and city + country.'});
    const google=(process.env.GOOGLE_PLACES_API_KEY||process.env.GOOGLE_MAPS_API_KEY||'').trim();
    const serp=(process.env.SERPAPI_API_KEY||process.env.SERP_API_KEY||'').trim();
    if(!serp)return json(503,{error:'Fuse needs SerpApi before live prospect research can run. Add SERPAPI_API_KEY in Vercel.',code:'SERPAPI_NOT_CONFIGURED'});
    const keys={serp:serp,hunter:(process.env.HUNTER_API_KEY||'').trim(),pagespeed:(process.env.PAGESPEED_API_KEY||google||'').trim()};
    const db=admin();
    const request=await db.from('client_research_requests').insert({user_id:user.id,source:google?'google_places+serp_web':'serp_maps+serp_web',niche:niche,location:location,criteria:{skill:skill,return_count:5,candidate_count:20},status:'processing',requested_at:new Date().toISOString()}).select('id').single();
    if(request.error)throw request.error;
    let places=[],mapsProvider='SerpApi Google Maps';
    if(google){
      const res=await fetch('https://places.googleapis.com/v1/places:searchText',{method:'POST',headers:{'Content-Type':'application/json','X-Goog-Api-Key':google,'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.types'},body:JSON.stringify({textQuery:niche+' in '+location,maxResultCount:20})});
      const raw=await res.json().catch(()=>({}));
      if(res.ok&&Array.isArray(raw.places)&&raw.places.length){
        places=raw.places;
        mapsProvider='Google Places';
      }
    }
    if(!places.length){
      const u=new URL('https://serpapi.com/search');
      u.searchParams.set('engine','google_maps');
      u.searchParams.set('type','search');
      u.searchParams.set('q',niche+' in '+location);
      u.searchParams.set('hl','en');
      u.searchParams.set('api_key',serp);
      const res=await fetch(u);
      const raw=await res.json().catch(()=>({}));
      if(!res.ok||raw.error)throw new Error(raw.error||'SerpApi Google Maps search failed.');
      places=(Array.isArray(raw.local_results)?raw.local_results:[]).map(x=>({
        id:clean(x.place_id||x.data_id,220),
        displayName:{text:clean(x.title,180)},
        formattedAddress:clean(x.address,240),
        nationalPhoneNumber:clean(x.phone,80),
        websiteUri:clean(x.website,700),
        rating:Number.isFinite(Number(x.rating))?Number(x.rating):null,
        userRatingCount:Number.isFinite(Number(x.reviews))?Number(x.reviews):null,
        googleMapsUri:x.place_id?'https://www.google.com/maps/search/?api=1&query_place_id='+encodeURIComponent(x.place_id):'',
        businessStatus:clean(x.open_state,80),
        types:[clean(x.type,120)].filter(Boolean)
      }));
      mapsProvider='SerpApi Google Maps';
    }
    places=places.sort((a,b)=>scoreBase(b)-scoreBase(a)).slice(0,10);
    const enriched=await Promise.all(places.map(p=>enrich(p,skill,location,keys)));
    const qualified=enriched.filter(x=>x.qualifies).sort((a,b)=>b.score-a.score).slice(0,5);
    const ids=qualified.map(x=>clean(x.place.id,220)).filter(Boolean);
    let existing=[];if(ids.length){const ex=await db.from('client_prospects').select('google_place_id').eq('user_id',user.id).in('google_place_id',ids);if(ex.error)throw ex.error;existing=ex.data||[]}
    const seen=new Set(existing.map(x=>x.google_place_id));
    const rows=qualified.filter(x=>!seen.has(x.place.id)).map((x,idx)=>({
      user_id:user.id,brand_name:x.name,niche:niche,location:clean(x.place.formattedAddress,240)||location,
      founder_name:x.contact&&x.contact.name||null,founder_title:x.contact&&x.contact.title||null,founder_linkedin:x.contact&&x.contact.linkedin||null,founder_email:x.contact&&x.contact.email||null,founder_phone:x.contact&&x.contact.phone||null,
      contact_name:x.contact&&x.contact.name||null,email:x.contact&&x.contact.email||null,whatsapp:clean(x.place.nationalPhoneNumber,80)||null,website:clean(x.place.websiteUri,700)||null,
      google_place_id:clean(x.place.id,220),maps_url:clean(x.place.googleMapsUri,900)||null,rating:Number.isFinite(Number(x.place.rating))?Number(x.place.rating):null,review_count:Number.isFinite(Number(x.place.userRatingCount))?Number(x.place.userRatingCount):null,business_status:clean(x.place.businessStatus,80)||null,
      opportunity_score:x.score,current_activity:x.whyNow||null,current_activity_url:x.signal&&x.signal.url||null,visible_problem:x.gap||('Current activity verified: '+x.whyNow),service:skill,status:'new',source:'Fuse verified research',research_request_id:request.data.id,
      source_links:x.sources,qualification_json:{rank:idx+1,why_now:x.whyNow||'Not found',gap:x.gap||'No separate gap verified; relevance comes from the current activity.',why_skill_relevant:skill+' is relevant because the business has a verified current activity and a matching visible opportunity.',offer:skill,starter_price:starterPrice(skill),best_contact_method:bestContact(x),ask_first:askFirstFor(x,skill),contactable:!!(x.place.nationalPhoneNumber||(x.contact&&x.contact.email)||x.place.websiteUri),verified_current_reason:!!x.signal,page_speed:x.page||null},
      signals:[x.signal?'current_activity_verified':null,x.gap?'skill_gap_verified':null,x.contact&&x.contact.email?'verified_email_found':null].filter(Boolean),
      evidence:x.sources.map(s=>({source:s.label,url:s.url}))
    }));
    let inserted=[];if(rows.length){const ins=await db.from('client_prospects').insert(rows).select('*');if(ins.error)throw ins.error;inserted=ins.data||[]}
    await db.from('client_research_requests').update({status:'completed',result_count:inserted.length,processed_at:new Date().toISOString()}).eq('id',request.data.id);
    await db.from('client_activities').insert({user_id:user.id,activity_type:'discovery',title:'Researched '+places.length+' '+niche+' businesses',body:'Kept the strongest '+qualified.length+' with a verified current reason to contact.',metadata:{request_id:request.data.id,skill:skill,niche:niche,location:location,candidates:places.length,qualified:qualified.length,inserted:inserted.length,maps_provider:mapsProvider,hunter_enabled:!!keys.hunter}});
    return json(200,{ok:true,request_id:request.data.id,candidates:places.length,qualified:qualified.length,added:inserted.length,duplicates:qualified.length-inserted.length,skipped:Math.max(0,places.length-qualified.length),maps_provider:mapsProvider,hunter_enabled:!!keys.hunter,prospects:inserted});
  }catch(e){console.error('[client-discover]',e);return json(500,{error:e&&e.message||'Could not research prospects right now.'})}
};