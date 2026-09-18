// POST /api/client-discover
// SerpApi-only V1: Google Maps discovery + fresh "why now" research + founder/contact enrichment.
// Designed to return only the five strongest prospects with source-backed facts.
const { admin, getUser, json } = require('./_supabase');

function clean(v,max=1000){return typeof v==='string'?v.trim().slice(0,max):''}
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
async function mapSearch(niche,location,key){
  const d=await serp({engine:'google_maps',type:'search',q:niche+' in '+location,hl:'en'},key);
  return (Array.isArray(d.local_results)?d.local_results:[]).map(x=>({
    id:clean(x.place_id||x.data_id,220),
    displayName:{text:clean(x.title,180)},
    formattedAddress:clean(x.address,240),
    nationalPhoneNumber:clean(x.phone,80),
    websiteUri:clean(x.website,700),
    rating:Number.isFinite(Number(x.rating))?Number(x.rating):null,
    userRatingCount:Number.isFinite(Number(x.reviews))?Number(x.reviews):null,
    googleMapsUri:x.place_id?'https://www.google.com/maps/search/?api=1&query_place_id='+encodeURIComponent(x.place_id):clean(x.links&&x.links.directions,900),
    businessStatus:clean(x.open_state,80),
    types:[clean(x.type,120)].filter(Boolean)
  }));
}
async function enrichStageOne(place,skill,location,niche,key){
  const name=clean(place.displayName&&place.displayName.text,180)||'Business';
  const domain=domainFrom(place.websiteUri||'');
  const [signal,contact]=await Promise.all([
    currentSignal(name,location,niche,key).catch(()=>null),
    websiteContact(place.websiteUri||'')
  ]);
  const gap=serviceGap(skill,place);
  const hasContact=!!(place.nationalPhoneNumber||contact.email||contact.instagram||place.websiteUri);
  const qualifies=!!signal&&hasContact;
  let score=scoreBase(place)+(signal?28:0)+(contact.email?10:0)+(contact.instagram?6:0)+(gap?12:0);
  score=Math.max(1,Math.min(100,score));
  return {place,name,domain,signal,contact,gap,whyNow:signal?signal.summary:'',qualifies,score};
}
async function finishEnrichment(x,skill,location,key){
  const founder=await founderLookup(x.name,location,x.domain,key).catch(()=>({name:'',title:'',linkedin:'',source:''}));
  let score=x.score+(founder.linkedin?8:0)+(founder.name?5:0);
  score=Math.max(1,Math.min(100,score));
  const sources=[];
  if(x.place.googleMapsUri)sources.push({label:'Google Maps',url:x.place.googleMapsUri});
  if(x.signal&&x.signal.url)sources.push({label:'Current activity',url:x.signal.url});
  if(x.place.websiteUri)sources.push({label:'Website',url:x.place.websiteUri});
  if(founder.source)sources.push({label:'Founder / decision-maker',url:founder.source});
  if(x.contact.instagram)sources.push({label:'Instagram',url:x.contact.instagram});
  return {...x,founder,score,sources};
}
exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const skill=clean(body.skill,180),niche=clean(body.niche,140),location=clean(body.location,180);
    if(!skill||!niche||!location)return json(400,{error:'Choose your skill, niche and city + country.'});
    const key=(process.env.SERPAPI_API_KEY||process.env.SERP_API_KEY||'').trim();
    if(!key)return json(503,{error:'Fuse needs SerpApi before live prospect research can run. Add SERPAPI_API_KEY in Vercel.',code:'SERPAPI_NOT_CONFIGURED'});

    const db=admin();
    const request=await db.from('client_research_requests').insert({
      user_id:user.id,source:'serp_maps+serp_web',niche,location,
      criteria:{skill,return_count:5,candidate_research_limit:8,provider:'SerpApi'},
      status:'processing',requested_at:new Date().toISOString()
    }).select('id').single();
    if(request.error)throw request.error;

    const mapRows=(await mapSearch(niche,location,key)).sort((a,b)=>scoreBase(b)-scoreBase(a));
    const candidates=mapRows.slice(0,8);
    const stageOne=await Promise.all(candidates.map(p=>enrichStageOne(p,skill,location,niche,key)));
    const shortlist=stageOne.filter(x=>x.qualifies).sort((a,b)=>b.score-a.score).slice(0,5);
    const qualified=(await Promise.all(shortlist.map(x=>finishEnrichment(x,skill,location,key)))).sort((a,b)=>b.score-a.score);

    const ids=qualified.map(x=>clean(x.place.id,220)).filter(Boolean);
    let existing=[];
    if(ids.length){
      const ex=await db.from('client_prospects').select('google_place_id').eq('user_id',user.id).in('google_place_id',ids);
      if(ex.error)throw ex.error;existing=ex.data||[];
    }
    const seen=new Set(existing.map(x=>x.google_place_id));
    const rows=qualified.filter(x=>!seen.has(x.place.id)).map((x,idx)=>{
      const bestEmail=x.contact.email||null;
      const bestPhone=x.place.nationalPhoneNumber||x.contact.phone||null;
      const why=x.whyNow||'Not found';
      const safeGap=x.gap||'No separate technical gap was verified; the opportunity is tied to the current activity above.';
      return {
        user_id:user.id,brand_name:x.name,niche,location:clean(x.place.formattedAddress,240)||location,
        founder_name:x.founder.name||null,founder_title:x.founder.title||null,founder_linkedin:x.founder.linkedin||null,
        founder_email:null,founder_phone:null,founder_instagram:null,
        contact_name:x.founder.name||null,email:bestEmail,whatsapp:bestPhone,
        instagram:x.contact.instagram||null,website:clean(x.place.websiteUri,700)||null,
        google_place_id:clean(x.place.id,220),maps_url:clean(x.place.googleMapsUri,900)||null,
        rating:Number.isFinite(Number(x.place.rating))?Number(x.place.rating):null,
        review_count:Number.isFinite(Number(x.place.userRatingCount))?Number(x.place.userRatingCount):null,
        business_status:clean(x.place.businessStatus,80)||null,
        opportunity_score:x.score,current_activity:why,current_activity_url:x.signal&&x.signal.url||null,
        visible_problem:safeGap,service:skill,status:'new',source:'Fuse Serp verified research',research_request_id:request.data.id,
        source_links:x.sources,
        qualification_json:{
          rank:idx+1,why_now:why,gap:safeGap,
          why_skill_relevant:skill+' is relevant because the business has a verified current activity and a matching reason to approach now.',
          offer:skill,starter_price:starterPrice(skill),best_contact_method:bestContact(x),ask_first:askFirstFor(x,skill),
          contactable:!!(bestPhone||bestEmail||x.contact.instagram||x.place.websiteUri),
          verified_current_reason:true,provider:'SerpApi'
        },
        signals:['current_activity_verified',x.gap?'skill_gap_verified':null,bestEmail?'public_email_found':null,x.founder.linkedin?'founder_linkedin_found':null].filter(Boolean),
        evidence:x.sources.map(s=>({source:s.label,url:s.url}))
      };
    });

    let inserted=[];
    if(rows.length){
      const ins=await db.from('client_prospects').insert(rows).select('*');
      if(ins.error)throw ins.error;inserted=ins.data||[];
    }
    await db.from('client_research_requests').update({status:'completed',result_count:inserted.length,processed_at:new Date().toISOString()}).eq('id',request.data.id);
    await db.from('client_activities').insert({
      user_id:user.id,activity_type:'discovery',
      title:'Serp researched '+candidates.length+' '+niche+' businesses',
      body:'Kept '+qualified.length+' with a verified current reason and usable public contact route.',
      metadata:{request_id:request.data.id,skill,niche,location,maps_results:mapRows.length,candidates:candidates.length,qualified:qualified.length,inserted:inserted.length,provider:'SerpApi'}
    });
    return json(200,{
      ok:true,request_id:request.data.id,maps_results:mapRows.length,candidates:candidates.length,
      qualified:qualified.length,added:inserted.length,duplicates:qualified.length-inserted.length,
      skipped:Math.max(0,candidates.length-qualified.length),maps_provider:'SerpApi Google Maps',
      contact_provider:'SerpApi + public website',prospects:inserted
    });
  }catch(e){
    console.error('[client-discover]',e);
    return json(500,{error:e&&e.message||'Could not research prospects right now.'});
  }
};
