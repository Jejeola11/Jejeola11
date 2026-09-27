// POST /api/client-discover
// SerpApi-only V1: Google Maps discovery + fresh "why now" research + founder/contact enrichment.
// Designed to return only the five strongest prospects with source-backed facts.
const { admin, getUser, json } = require('./_supabase');
const firecrawl = require('./_firecrawl');

function clean(v,max=1000){return typeof v==='string'?v.trim().slice(0,max):''}
const DISCOVERY_CREDITS={5:20,10:40,20:80};
function domainFrom(url){try{return new URL(url).hostname.replace(/^www\./,'').toLowerCase()}catch{return''}}
function textNorm(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function firstWords(v,n=4){return textNorm(v).split(' ').filter(x=>x.length>2).slice(0,n)}
function mentionsBusiness(name,text){
  const hay=textNorm(text),words=firstWords(name,4);
  return words.length?words.filter(w=>hay.includes(w)).length>=Math.min(2,words.length):false;
}
function scoreBase(p){
  let s=18;
  if(p.websiteUri)s+=10;
  if(p.nationalPhoneNumber)s+=10;
  if(Number(p.userRatingCount||0)>=20)s+=5;
  if(Number(p.userRatingCount||0)>=100)s+=5;
  if(Number(p.rating||0)>=4.2)s+=3;
  return s;
}
function starterPrice(skill){
  const s=String(skill||'').toLowerCase();
  if(/landing|page|website/.test(s))return {currency:'USD',amount:250};
  if(/video|ugc|ad/.test(s))return {currency:'USD',amount:150};
  if(/brand/.test(s))return {currency:'USD',amount:300};
  if(/google business|profile/.test(s))return {currency:'USD',amount:200};
  return {currency:'USD',amount:100};
}
function serviceGap(skill,p){
  const k=String(skill||'').toLowerCase();
  if(/landing|page|website/.test(k)&&!p.websiteUri)return 'No website is listed on the business profile.';
  if(/google business|profile/.test(k)){
    if(Number.isFinite(Number(p.rating))&&Number(p.rating)<4.4)return 'Google Maps rating is '+Number(p.rating).toFixed(1)+' with '+Number(p.userRatingCount||0)+' reviews.';
    if(Number(p.userRatingCount||0)<50)return 'The Google Maps listing currently shows '+Number(p.userRatingCount||0)+' reviews.';
  }
  return '';
}
function bestContact(x){
  if(x.contact&&x.contact.email)return 'Email';
  if(x.founder&&x.founder.linkedin)return 'LinkedIn';
  if(x.contact&&x.contact.instagram)return 'Instagram DM';
  if(x.place&&x.place.nationalPhoneNumber)return 'WhatsApp / phone';
  return x.place&&x.place.websiteUri?'Website contact route':'Not found';
}
function canonicalKey(x){
  const place=clean(x.place&&x.place.id,220);
  if(place)return 'place:'+place;
  const domain=clean(x.domain,240).toLowerCase();
  if(domain)return 'domain:'+domain;
  return 'brand:'+textNorm(x.name)+'|'+textNorm(x.place&&x.place.formattedAddress);
}
function savedProspectKey(p){
  if(clean(p&&p.google_place_id,220))return 'place:'+clean(p.google_place_id,220);
  const domain=domainFrom(p&&p.website||'');
  if(domain)return 'domain:'+domain;
  return 'brand:'+textNorm(p&&p.brand_name)+'|'+textNorm(p&&p.location);
}
function askFirstFor(x,skill){
  const who=x.founder&&x.founder.name?x.founder.name:x.name;
  const observed=x.signal&&x.signal.summary?x.signal.summary:(x.whyNow||'what you are currently promoting');
  const gap=x.gap||('a focused '+skill+' idea connected to that activity');
  return 'Hi '+who+', I came across '+observed+'. I noticed '+gap.charAt(0).toLowerCase()+gap.slice(1)+' I have an idea for '+skill+' that could make that campaign/customer journey clearer. Would you be open to seeing a quick concept?';
}
async function serp(params,key){
  const u=new URL('https://serpapi.com/search');
  Object.entries(params).forEach(([k,v])=>{if(v!==undefined&&v!==null&&v!=='')u.searchParams.set(k,String(v))});
  u.searchParams.set('api_key',key);
  const controller=new AbortController();const t=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch(u,{signal:controller.signal});
    const d=await r.json().catch(()=>({}));
    if(!r.ok||d.error)throw new Error(d.error||'SerpApi request failed.');
    return d;
  }finally{clearTimeout(t)}
}
async function currentSignal(name,location,niche,key){
  const q='"'+name+'" '+location+' ('+
    ['launch','launching','new','opening','hiring','event','campaign','offer','sale','partnership','expansion','introduces','announces'].join(' OR ')+')';
  const d=await serp({engine:'google',q,location,hl:'en',num:8,tbs:'qdr:m6'},key);
  const rows=Array.isArray(d.organic_results)?d.organic_results:[];
  const hit=rows.find(x=>{
    if(!x||!x.link||!x.title||String(x.snippet||'').length<20)return false;
    const joined=[x.title,x.snippet].join(' ');
    return mentionsBusiness(name,joined);
  });
  if(!hit)return null;
  const snippet=clean(hit.snippet,700);
  const title=clean(hit.title,260);
  return {title,snippet,url:clean(hit.link,1200),date:clean(hit.date,120),summary:title+(snippet?' — '+snippet:'')};
}
function extractEmails(html){
  const out=new Set();
  const mail=[...String(html||'').matchAll(/mailto:([^"'?#\s>]+)/gi)].map(m=>decodeURIComponent(m[1]||''));
  const raw=[...String(html||'').matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)].map(m=>m[0]);
  [...mail,...raw].forEach(x=>{const v=clean(x,320).toLowerCase();if(v&&!/example\.com|sentry|wixpress|cloudflare/.test(v))out.add(v)});
  return [...out].slice(0,4);
}
function hrefMatches(html,host){
  const re=new RegExp("https?:\\/\\/(?:www\\.)?"+host.replace(/\./g,'\\.')+"\\/[^\"'<>\\s]*",'ig');
  return [...String(html||'').matchAll(re)].map(m=>clean(m[0],900));
}
async function websiteContact(url){
  if(!url)return {email:'',phone:'',instagram:'',linkedin_company:'',source:''};
  const controller=new AbortController();const t=setTimeout(()=>controller.abort(),8000);
  try{
    const r=await fetch(url,{signal:controller.signal,headers:{'User-Agent':'Mozilla/5.0 (compatible; FuseClientResearch/1.0)'}});
    if(!r.ok)return {email:'',phone:'',instagram:'',linkedin_company:'',source:url};
    const html=(await r.text()).slice(0,900000);
    const emails=extractEmails(html);
    const tel=[...html.matchAll(/tel:([^"'?#\s>]+)/gi)].map(m=>clean(decodeURIComponent(m[1]||''),120)).find(Boolean)||'';
    const ig=hrefMatches(html,'instagram.com').find(Boolean)||'';
    const li=hrefMatches(html,'linkedin.com').find(x=>/\/company\//i.test(x))||'';
    return {email:emails[0]||'',phone:tel,instagram:ig,linkedin_company:li,source:url};
  }catch{return {email:'',phone:'',instagram:'',linkedin_company:'',source:url}}
  finally{clearTimeout(t)}
}
async function founderLookup(name,location,domain,key){
  const q='"'+name+'" (founder OR owner OR CEO OR "chief executive" OR "head of marketing") LinkedIn';
  const d=await serp({engine:'google',q,location,hl:'en',num:8},key);
  const rows=Array.isArray(d.organic_results)?d.organic_results:[];
  for(const x of rows){
    if(!x||!x.link||!x.title)continue;
    const joined=[x.title,x.snippet].join(' ');
    if(!mentionsBusiness(name,joined))continue;
    if(/linkedin\.com\/in\//i.test(x.link)){
      let person=clean(String(x.title).split(/\s[-|·]\s/)[0],220);
      if(!person||mentionsBusiness(name,person))person='';
      const snippet=clean(x.snippet,700);
      const role=(snippet.match(/(?:founder|co-founder|owner|chief executive officer|ceo|head of marketing|marketing director)[^.;|]*/i)||[])[0]||'';
      return {name:person,title:clean(role,220),linkedin:clean(x.link,900),source:clean(x.link,900)};
    }
  }
  const siteHit=rows.find(x=>x&&x.link&&domain&&domainFrom(x.link)===domain&&/(founder|owner|ceo|chief executive)/i.test([x.title,x.snippet].join(' ')));
  if(siteHit){
    return {name:'',title:'',linkedin:'',source:clean(siteHit.link,900)};
  }
  return {name:'',title:'',linkedin:'',source:''};
}
function businessSegment(x){
  const hay=textNorm([x.name,x.place&&x.place.types,x.place&&x.place.websiteUri].join(' '));
  if(/skin|beauty|cosmetic|aesthetic|spa|makeup|wellness/.test(hay))return 'skincare';
  if(/jewel|ring|gold|watch|accessor/.test(hay))return 'jewellery';
  if(/fashion|cloth|wear|boutique|hijab|apparel|shoe/.test(hay))return 'fashion';
  return 'business';
}
function tailoredOfferFor(x,skill,baseOffer){
  const segment=businessSegment(x), text=textNorm([skill,baseOffer].join(' ')), brand=x.name;
  if(/ugc|influencer|twin|avatar|video/.test(text)){
    if(segment==='skincare')return 'One AI-twin skincare routine or product-benefit reel for '+brand+' — focused on one hero product and a clear Shop Now CTA.';
    if(segment==='jewellery')return 'One AI-twin jewellery styling reel for '+brand+' — close-up product detail, one occasion and a clear Shop Now CTA.';
    if(segment==='fashion')return 'One AI-twin fashion styling or try-on reel for '+brand+' — one collection, one look and a clear Shop Now CTA.';
  }
  if(/landing|website|page/.test(text))return 'A focused campaign landing page for '+brand+' that matches one active offer and gives visitors one clear next step.';
  if(/design|flyer|graphic/.test(text)){
    if(segment==='skincare')return 'A skincare campaign graphic for '+brand+' that explains one concern, one product/service benefit and one clear booking or Shop Now CTA.';
    if(segment==='jewellery')return 'A jewellery launch or gifting campaign graphic for '+brand+' that makes one collection and its next step instantly clear.';
    if(segment==='fashion')return 'A fashion collection campaign graphic for '+brand+' that shows one look, one reason to buy and one clear Shop Now CTA.';
  }
  return clean(baseOffer,300)||('A focused '+skill+' concept tailored to '+brand+'.');
}
function tailoredGapFor(x,skill){
  const segment=businessSegment(x);
  if(/ugc|influencer|twin|avatar|video/.test(textNorm(skill))){
    if(segment==='skincare')return 'A short product-benefit or routine video can make one skincare item easier to understand before someone buys.';
    if(segment==='jewellery')return 'A close-up styling video can help shoppers picture the jewellery in a real occasion before they buy.';
    if(segment==='fashion')return 'A styling or try-on video can help shoppers see how one fashion piece fits into a complete look.';
  }
  return serviceGap(skill,x.place)||('Fuse will connect the offer to one verified public campaign before recommending outreach.');
}
function publicPromotionSignal(text,url){
  const lines=String(text||'').split(/[\n.!?]/).map(x=>clean(x,360)).filter(Boolean);
  const hit=lines.find(x=>/(new arrival|new collection|now available|just launched|shop now|limited|sale|offer|discount|book now|pre-?order|launch)/i.test(x)&&x.length>18);
  return hit?{summary:'Public website promotion: '+hit,url:clean(url,1200)}:null;
}
async function mapSearch(niche,location,key){
  // One Maps query can be very narrow. Search nearby wording too so "find 5 more"
  // keeps looking for new businesses rather than stopping at the same first few.
  const terms=[niche,niche+' shop',niche+' store'].filter((v,i,a)=>v&&a.indexOf(v)===i);
  const responses=await Promise.all(terms.map(q=>serp({engine:'google_maps',type:'search',q:q+' in '+location,hl:'en'},key).catch(()=>({}))));
  const seen=new Set(),rows=[];
  for(const d of responses){
    for(const x of (Array.isArray(d.local_results)?d.local_results:[])){
      const id=clean(x.place_id||x.data_id,220);
      const key=id||('brand:'+textNorm(x.title)+'|'+textNorm(x.address));
      if(!key||seen.has(key))continue;seen.add(key);
      rows.push({
        id,
        displayName:{text:clean(x.title,180)},
        formattedAddress:clean(x.address,240),
        nationalPhoneNumber:clean(x.phone,80),
        websiteUri:clean(x.website,700),
        rating:Number.isFinite(Number(x.rating))?Number(x.rating):null,
        userRatingCount:Number.isFinite(Number(x.reviews))?Number(x.reviews):null,
        googleMapsUri:x.place_id?'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(clean(x.title,180)+' '+clean(x.address,240))+'&query_place_id='+encodeURIComponent(x.place_id):clean(x.links&&x.links.directions,900),
        businessStatus:clean(x.open_state,80),
        types:[clean(x.type,120)].filter(Boolean)
      });
    }
  }
  return rows;
}
async function enrichStageOne(place,skill,location,niche,key){
  const name=clean(place.displayName&&place.displayName.text,180)||'Business';
  const domain=domainFrom(place.websiteUri||'');
  const [signal,contact]=await Promise.all([
    currentSignal(name,location,niche,key).catch(()=>null),
    websiteContact(place.websiteUri||'')
  ]);
  const gap=serviceGap(skill,place);
  // A student should never get an empty batch simply because a small business has
  // not been mentioned in Google's news index. We keep that distinction visible:
  // "strong" has a current campaign/launch signal; "ready" has an active public
  // business route and a service-relevant opportunity.
  const hasContact=!!(place.nationalPhoneNumber||contact.email||contact.instagram||place.websiteUri);
  const qualifies=hasContact;
  const readiness=signal?'strong':'ready';
  const fallbackWhy='Active public Google Maps listing with a '+(place.websiteUri?'website':'direct contact route')+' for '+name+'.';
  const fallbackGap=gap||('A focused '+skill+' offer can give this business a clearer next step for people discovering it online.');
  let score=scoreBase(place)+(signal?28:0)+(contact.email?10:0)+(contact.instagram?6:0)+(gap?12:0)+(place.websiteUri?4:0);
  score=Math.max(1,Math.min(100,score));
  return {place,name,domain,signal,contact,gap:fallbackGap,whyNow:signal?signal.summary:fallbackWhy,readiness,qualifies,score,agentOffer:''};
}
function extractPhones(text){
  const values=[...String(text||'').matchAll(/(?:\+?\d[\d\s().-]{7,}\d)/g)].map(m=>clean(m[0],80));
  return values.find(x=>x.replace(/\D/g,'').length>=8)||'';
}
function socialLink(text,network){
  const re=network==='instagram'?/https?:\/\/(?:www\.)?instagram\.com\/[^\s)"'<>]+/ig:/https?:\/\/(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|company)\/[^\s)"'<>]+/ig;
  const hit=[...String(text||'').matchAll(re)][0];
  return hit?clean(hit[0].replace(/[.,;]+$/,''),900):'';
}
function founderFromText(text,business){
  const lines=String(text||'').split(/[\n.!?]/).map(x=>clean(x,500)).filter(Boolean);
  for(const line of lines){
    if(!/(founder|co-founder|owner|ceo|chief executive)/i.test(line))continue;
    if(line.length>300)continue;
    const named=(line.match(/(?:founded by|founder(?: and ceo)?(?: is|:|-)?|co-founder(?: is|:|-)?|owner(?: is|:|-)?|ceo(?: is|:|-)?)[\s]*([A-Z][a-z]+(?:\s+[A-Z][a-z.'-]+){1,3})/i)||[])[1]||'';
    if(named&&textNorm(named)!==textNorm(business))return {name:clean(named,180),title:(line.match(/(founder|co-founder|owner|ceo|chief executive[^,.;]*)/i)||[])[1]||''};
  }
  return {name:'',title:''};
}
function sameDomain(url,domain){return !!domain&&domainFrom(url)===domain}
async function firecrawlWebsiteResearch(x,location){
  if(!firecrawl.enabled()||!x.place.websiteUri)return {contact:{},founder:{},signal:null,sources:[]};
  try{
    const home=await firecrawl.scrape(x.place.websiteUri);
    if(!home)return {contact:{},founder:{},signal:null,sources:[]};
    const useful=(home.links||[]).filter(u=>sameDomain(u,x.domain)&&/(about|team|founder|story|contact|our-?people)/i.test(u)).slice(0,2);
    const pages=(await Promise.all(useful.map(u=>firecrawl.scrape(u).catch(()=>null)))).filter(Boolean);
    const all=[home,...pages];
    const text=all.map(p=>[p.title,p.description,p.markdown,(p.links||[]).join(' ')].filter(Boolean).join('\n')).join('\n');
    const emails=extractEmails(text);
    const contact={
      email:emails[0]||'',
      phone:extractPhones(text),
      instagram:socialLink(text,'instagram'),
      linkedin_company:(socialLink(text,'linkedin').match(/linkedin\.com\/company\//i)?socialLink(text,'linkedin'):'')
    };
    const founder=founderFromText(text,x.name);
    const sources=all.map((p,i)=>p.url?{label:i?'Firecrawl: public business page':'Firecrawl: website',url:p.url}:null).filter(Boolean);
    return {contact,founder,signal:publicPromotionSignal(text,home.url||x.place.websiteUri),sources};
  }catch(e){
    console.warn('[firecrawl website]',e&&e.message||e);
    return {contact:{},founder:{},signal:null,sources:[]};
  }
}
async function firecrawlFounderLookup(name,location){
  if(!firecrawl.enabled())return {name:'',title:'',linkedin:'',source:''};
  try{
    const results=await firecrawl.search('"'+name+'" (founder OR owner OR CEO) '+location,{location,limit:5});
    for(const row of results){
      const text=[row.title,row.description,row.markdown].join(' ');
      if(!mentionsBusiness(name,text))continue;
      const linked=socialLink([row.url,text].join(' '),'linkedin');
      const found=founderFromText(text,name);
      if(found.name||linked)return {name:found.name||'',title:clean(found.title,180),linkedin:linked&&/linkedin\.com\/in\//i.test(linked)?linked:'',source:row.url||linked||''};
    }
    return {name:'',title:'',linkedin:'',source:''};
  }catch(e){
    console.warn('[firecrawl founder]',e&&e.message||e);
    return {name:'',title:'',linkedin:'',source:''};
  }
}
async function finishEnrichment(x,skill,location,key){
  const [serpFounder,webResearch,webFounder]=await Promise.all([
    founderLookup(x.name,location,x.domain,key).catch(()=>({name:'',title:'',linkedin:'',source:''})),
    firecrawlWebsiteResearch(x,location),
    firecrawlFounderLookup(x.name,location)
  ]);
  const fcContact=webResearch.contact||{};
  const contact={...x.contact,email:fcContact.email||x.contact.email||'',phone:fcContact.phone||x.contact.phone||'',instagram:fcContact.instagram||x.contact.instagram||'',linkedin_company:fcContact.linkedin_company||x.contact.linkedin_company||''};
  const founder={name:webFounder.name||serpFounder.name||webResearch.founder?.name||'',title:webFounder.title||serpFounder.title||webResearch.founder?.title||'',linkedin:webFounder.linkedin||serpFounder.linkedin||'',source:webFounder.source||serpFounder.source||''};
  const signal=x.signal||webResearch.signal||null;
  const verified=!!signal;
  const offer=tailoredOfferFor(x,skill,x.agentOffer||'');
  const gap=tailoredGapFor(x,skill);
  let score=x.score+(founder.linkedin?8:0)+(founder.name?5:0)+(fcContact.email?6:0)+(verified?24:-12);
  score=Math.max(1,Math.min(100,score));
  const sources=[];
  if(x.place.googleMapsUri)sources.push({label:'Google Maps',url:x.place.googleMapsUri});
  if(signal&&signal.url)sources.push({label:'Current promotion',url:signal.url});
  if(x.place.websiteUri)sources.push({label:'Website',url:x.place.websiteUri});
  (webResearch.sources||[]).forEach(source=>sources.push(source));
  if(founder.source)sources.push({label:'Founder / decision-maker',url:founder.source});
  if(contact.instagram)sources.push({label:'Instagram',url:contact.instagram});
  const unique=sources.filter((source,i,all)=>source&&source.url&&all.findIndex(item=>item.url===source.url)===i);
  return {...x,contact,founder,signal,offer,gap,whyNow:signal?signal.summary:'No verified current campaign was found.',readiness:verified?'strong':'needs_audit',verified,score,sources:unique,firecrawl_used:firecrawl.enabled()};
}
exports.handler=async(event)=>{
  let charged=false,chargedDb=null,chargedUser=null,chargedCredits=0;
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const skill=clean(body.skill,180),niche=clean(body.niche,140),location=clean(body.location,180);
    if(!skill||!niche||!location)return json(400,{error:'Choose your skill, niche and city + country.'});
    const returnCount=[5,10,20].includes(Number(body.return_count))?Number(body.return_count):5;
    const credits=DISCOVERY_CREDITS[returnCount];
    const key=(process.env.SERPAPI_API_KEY||process.env.SERP_API_KEY||'').trim();
    if(!key)return json(503,{error:'Fuse needs SerpApi before live prospect research can run. Add SERPAPI_API_KEY in Vercel.',code:'SERPAPI_NOT_CONFIGURED'});

    const db=admin();
    const profileQ=await db.from('client_agent_profiles').select('memory_summary,profile_json,portfolio_urls').eq('user_id',user.id).maybeSingle();
    if(profileQ.error)throw profileQ.error;
    const profile=profileQ.data||{memory_summary:'',profile_json:{},portfolio_urls:[]};
    const existingQ=await db.from('client_prospects').select('google_place_id,website,brand_name,location').eq('user_id',user.id);
    if(existingQ.error)throw existingQ.error;
    const existingKeys=new Set((existingQ.data||[]).map(savedProspectKey));
    const agentOffer=clean(body.offer,300)||clean(profile.profile_json&&profile.profile_json.work,300)||skill;
    const agentPrice=clean(body.starter_price,100)||clean(profile.profile_json&&profile.profile_json.price,100)||'';
    const {data:balance,error:spendError}=await db.rpc('spend_credits',{uid:user.id,amount:credits});
    if(spendError)throw spendError;
    if(balance===null)return json(402,{error:'You need '+credits+' credits to research '+returnCount+' prospects.',code:'NO_CREDITS'});
    charged=true;chargedDb=db;chargedUser=user.id;chargedCredits=credits;
    const request=await db.from('client_research_requests').insert({
      user_id:user.id,source:'serp_maps+firecrawl_web',niche,location,skill,locations:[location],
      credit_cost:credits,criteria:{skill,return_count:returnCount,candidate_research_limit:returnCount===5?12:returnCount===10?24:48,provider:firecrawl.enabled()?'SerpApi + Firecrawl':'SerpApi'},
      requested_count:returnCount,credits_charged:credits,
      offer:{offer:agentOffer,starter_price:agentPrice||starterPrice(skill)},provider_summary:{provider:firecrawl.enabled()?'SerpApi + Firecrawl':'SerpApi',status:'processing'},
      offer_json:{offer:agentOffer,starter_price:agentPrice||starterPrice(skill)},
      profile_snapshot:{memory_summary:profile.memory_summary||'',profile_json:profile.profile_json||{},portfolio_urls:profile.portfolio_urls||[]},
      status:'processing',requested_at:new Date().toISOString()
    }).select('id').single();
    if(request.error){await db.rpc('add_credits',{uid:user.id,amount:credits,why:'client_discovery_refund'});charged=false;throw request.error}

    const mapRows=(await mapSearch(niche,location,key)).sort((a,b)=>scoreBase(b)-scoreBase(a));
    // Never spend a new search on a lead already saved in this student's workspace.
    const freshMapRows=mapRows.filter(place=>!existingKeys.has(canonicalKey({place,name:clean(place.displayName&&place.displayName.text,180),domain:domainFrom(place.websiteUri||'')})));
    const candidates=freshMapRows.slice(0,returnCount===5?24:returnCount===10?40:60);
    const stageOne=await Promise.all(candidates.map(p=>enrichStageOne(p,skill,location,niche,key)));
    stageOne.forEach(x=>{x.agentOffer=agentOffer});
    // Research extra candidates so a business already reserved for another student
    // does not turn a requested batch of five into an empty one.
    const shortlist=stageOne.filter(x=>x.qualifies).sort((a,b)=>b.score-a.score)
      .slice(0,Math.min(candidates.length,Math.max(returnCount*2,returnCount+5)));
    const enriched=(await Promise.all(shortlist.map(x=>finishEnrichment(x,skill,location,key)))).sort((a,b)=>b.score-a.score);
    // A verified promotion ranks first. If fewer than the requested number have one,
    // include contactable businesses clearly marked "needs audit" rather than showing
    // the old leads again or returning an empty batch.
    const qualified=[...enriched.filter(x=>x.verified),...enriched.filter(x=>!x.verified)];

    const rows=[];let globallyReserved=0;
    for(const [idx,x] of qualified.entries()){
      if(rows.length>=returnCount)break;
      const registry=await db.from('client_prospect_registry').insert({
        canonical_key:canonicalKey(x),google_place_id:clean(x.place.id,220)||null,domain:x.domain||null,
        brand_name:x.name,location:clean(x.place.formattedAddress,240)||location,assigned_user_id:user.id
      }).select('id').maybeSingle();
      if(registry.error){
        if(String(registry.error.code||'')==='23505'){globallyReserved++;continue}
        throw registry.error;
      }
      const bestEmail=x.contact.email||null;
      const bestPhone=x.place.nationalPhoneNumber||x.contact.phone||null;
      const why=x.whyNow||'Not found';
      const safeGap=x.gap||'Fuse could not verify a tailored opportunity yet.';
      rows.push({
        user_id:user.id,brand_name:x.name,niche,location:clean(x.place.formattedAddress,240)||location,
        founder_name:x.founder.name||null,founder_title:x.founder.title||null,founder_linkedin:x.founder.linkedin||null,
        founder_email:null,founder_phone:null,founder_instagram:null,
        contact_name:x.founder.name||null,email:bestEmail,whatsapp:bestPhone,
        instagram:x.contact.instagram||null,website:clean(x.place.websiteUri,700)||null,
        google_place_id:clean(x.place.id,220),registry_id:registry.data.id,research_date:new Date().toISOString(),contact_method:bestContact(x),maps_url:clean(x.place.googleMapsUri,900)||null,
        rating:Number.isFinite(Number(x.place.rating))?Number(x.place.rating):null,
        review_count:Number.isFinite(Number(x.place.userRatingCount))?Number(x.place.userRatingCount):null,
        business_status:clean(x.place.businessStatus,80)||null,
        opportunity_score:x.score,current_activity:why,current_activity_url:x.signal&&x.signal.url||null,
        visible_problem:safeGap,service:skill,status:'new',source:firecrawl.enabled()?'Fuse public web research':'Fuse Serp verified research',research_request_id:request.data.id,
        source_links:x.sources,
        qualification_json:{
          rank:idx+1,why_now:why,gap:safeGap,
          why_skill_relevant:(x.offer||skill)+' is relevant because Fuse verified a current public promotion and tailored the offer to the brand category.',
          offer:x.offer||agentOffer,starter_price:starterPrice(skill),starter_price_label:agentPrice||null,best_contact_method:bestContact(x),ask_first:askFirstFor({...x,gap:safeGap,whyNow:why},x.offer||skill),
          contactable:!!(bestPhone||bestEmail||x.contact.instagram||x.place.websiteUri),
          confidence:x.readiness,
          verified_current_reason:x.readiness==='strong',provider:firecrawl.enabled()?'SerpApi + Firecrawl':'SerpApi'
        },
        signals:[x.readiness==='strong'?'current_activity_verified':'public_business_route_verified',x.gap?'skill_gap_verified':null,bestEmail?'public_email_found':null,x.founder.linkedin?'founder_linkedin_found':null].filter(Boolean),
        evidence:x.sources.map(s=>({source:s.label,url:s.url}))
      });
    }

    let inserted=[];
    if(rows.length){
      const ins=await db.from('client_prospects').insert(rows).select('*');
      if(ins.error)throw ins.error;inserted=ins.data||[];
    }
    const refund=Math.max(0,credits-Math.ceil((inserted.length/returnCount)*credits));
    if(refund){await db.rpc('add_credits',{uid:user.id,amount:refund,why:'client_discovery_partial_refund'})}
    charged=false;
    await db.from('client_research_requests').update({status:'completed',result_count:inserted.length,credits_refunded:refund,processed_at:new Date().toISOString()}).eq('id',request.data.id);
    await db.from('client_activities').insert({
      user_id:user.id,activity_type:'discovery',
      title:'Serp researched '+candidates.length+' '+niche+' businesses',
      body:'Kept '+inserted.length+' businesses with a usable public contact route; current-campaign evidence is labelled where found.',
      metadata:{request_id:request.data.id,skill,niche,location,maps_results:mapRows.length,candidates:candidates.length,qualified:qualified.length,inserted:inserted.length,globally_reserved:globallyReserved,provider:firecrawl.enabled()?'SerpApi + Firecrawl':'SerpApi'}
    });
    return json(200,{
      ok:true,request_id:request.data.id,maps_results:mapRows.length,candidates:candidates.length,
      qualified:qualified.length,added:inserted.length,duplicates:globallyReserved,
      skipped:Math.max(0,candidates.length-qualified.length),maps_provider:'SerpApi Google Maps',
      contact_provider:firecrawl.enabled()?'Firecrawl public web + SerpApi':'SerpApi + public website',credits_charged:credits,credits_refunded:refund,credits_remaining:balance+refund,prospects:inserted
    });
  }catch(e){
    if(charged&&chargedDb&&chargedUser&&chargedCredits){
      try{await chargedDb.rpc('add_credits',{uid:chargedUser,amount:chargedCredits,why:'client_discovery_refund'})}catch(_){}
    }
    console.error('[client-discover]',e);
    return json(500,{error:e&&e.message||'Could not research prospects right now.'});
  }
};
