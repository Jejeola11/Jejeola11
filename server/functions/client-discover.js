// POST /api/client-discover
// Finds public local-business prospects with Google Places API (New), scores visible
// opportunities, de-duplicates by Place ID and saves them into Fuse Client.
const { admin, getUser, json } = require('./_supabase');

function clean(v,max=300){return typeof v==='string'?v.trim().slice(0,max):''}
function integer(v,min,max,fallback){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback}
function scorePlace(p={}){
  let score=18;
  if(!p.websiteUri)score+=30;
  if(Number.isFinite(Number(p.rating))){
    const r=Number(p.rating);
    if(r<4)score+=20; else if(r<4.4)score+=12;
  }
  const reviews=Number(p.userRatingCount||0);
  if(reviews<15)score+=18; else if(reviews<50)score+=12; else if(reviews<100)score+=6;
  if(p.nationalPhoneNumber)score+=6;
  return Math.max(1,Math.min(100,score));
}
function problemFor(p={}){
  const bits=[];
  if(!p.websiteUri)bits.push('No website is listed on the Google Business Profile');
  const reviews=Number(p.userRatingCount||0);
  if(Number.isFinite(Number(p.rating))&&Number(p.rating)<4.4)bits.push(`Google rating is ${Number(p.rating).toFixed(1)}`);
  if(reviews<50)bits.push(`review volume is ${reviews} review${reviews===1?'':'s'}`);
  return bits.length?bits.join('; ')+'.':'Google profile found. Run the Fuse audit to identify the strongest pitchable opportunity.';
}
function bestService(p={}){
  if(!p.websiteUri)return 'Landing Page Design';
  const r=Number(p.rating||0),reviews=Number(p.userRatingCount||0);
  if((r&&r<4.4)||reviews<50)return 'Google Business Profile Growth';
  return 'Brand Creative';
}

exports.handler=async(event)=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request.'})}
    const niche=clean(body.niche,120),location=clean(body.location,180);
    const limit=integer(body.limit,2,20,10);
    if(!niche||!location)return json(400,{error:'Choose a niche and location first.'});

    const db=admin();
    const request=await db.from('client_research_requests').insert({
      user_id:user.id,source:'google_places',niche,location,
      criteria:{limit},status:'processing',requested_at:new Date().toISOString()
    }).select('id').single();
    if(request.error)throw request.error;

    const key=(process.env.GOOGLE_PLACES_API_KEY||process.env.GOOGLE_MAPS_API_KEY||'').trim();
    if(!key){
      await db.from('client_research_requests').update({status:'configuration_required',error:'Google Places API key is not configured.',processed_at:new Date().toISOString()}).eq('id',request.data.id);
      return json(503,{error:'Google prospect discovery is ready, but the Google Places connection still needs to be added by the Fuse owner.',code:'GOOGLE_PLACES_NOT_CONFIGURED',request_id:request.data.id});
    }

    const res=await fetch('https://places.googleapis.com/v1/places:searchText',{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Goog-Api-Key':key,
        'X-Goog-FieldMask':'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.googleMapsUri,places.businessStatus,places.types'
      },
      body:JSON.stringify({textQuery:`${niche} in ${location}`,maxResultCount:limit})
    });
    const raw=await res.json().catch(()=>({}));
    if(!res.ok){
      const message=raw?.error?.message||'Google Places could not complete this search.';
      await db.from('client_research_requests').update({status:'failed',error:message,processed_at:new Date().toISOString()}).eq('id',request.data.id);
      return json(res.status>=500?502:400,{error:message});
    }

    const places=Array.isArray(raw.places)?raw.places.slice(0,limit):[];
    const ids=places.map(p=>clean(p.id,200)).filter(Boolean);
    let existing=[];
    if(ids.length){
      const ex=await db.from('client_prospects').select('id,google_place_id').eq('user_id',user.id).in('google_place_id',ids);
      if(ex.error)throw ex.error;existing=ex.data||[];
    }
    const seen=new Set(existing.map(x=>x.google_place_id));
    const rows=places.filter(p=>p.id&&!seen.has(p.id)).map(p=>({
      user_id:user.id,
      brand_name:clean(p.displayName?.text,180)||'Local business',
      niche,
      location:clean(p.formattedAddress,240)||location,
      whatsapp:clean(p.nationalPhoneNumber,80)||null,
      website:clean(p.websiteUri,500)||null,
      google_place_id:clean(p.id,220),
      maps_url:clean(p.googleMapsUri,700)||null,
      rating:Number.isFinite(Number(p.rating))?Number(p.rating):null,
      review_count:Number.isFinite(Number(p.userRatingCount))?Number(p.userRatingCount):null,
      business_status:clean(p.businessStatus,80)||null,
      opportunity_score:scorePlace(p),
      visible_problem:problemFor(p),
      service:bestService(p),
      status:'new',
      source:'Google Business Profile',
      research_request_id:request.data.id,
      signals:[
        ...(!p.websiteUri?['missing_website']:[]),
        ...(Number(p.userRatingCount||0)<50?['low_review_volume']:[]),
        ...(Number(p.rating||5)<4.4?['rating_opportunity']:[])
      ],
      evidence:[{source:'Google Places',rating:p.rating??null,review_count:p.userRatingCount??null,address:p.formattedAddress||'',maps_url:p.googleMapsUri||''}]
    }));

    let inserted=[];
    if(rows.length){
      const ins=await db.from('client_prospects').insert(rows).select('*');
      if(ins.error)throw ins.error;inserted=ins.data||[];
    }
    await db.from('client_research_requests').update({status:'completed',result_count:inserted.length,processed_at:new Date().toISOString()}).eq('id',request.data.id);
    await db.from('client_activities').insert({
      user_id:user.id,activity_type:'discovery',title:`Found ${places.length} ${niche} businesses`,
      body:`${inserted.length} new prospect${inserted.length===1?' was':'s were'} added from ${location}.`,
      metadata:{request_id:request.data.id,niche,location,returned:places.length,inserted:inserted.length,duplicates:places.length-inserted.length}
    });
    return json(200,{ok:true,request_id:request.data.id,returned:places.length,added:inserted.length,duplicates:places.length-inserted.length,prospects:inserted});
  }catch(e){
    console.error('[client-discover]',e);
    return json(500,{error:e?.message||'Could not find prospects right now.'});
  }
};
