// Firecrawl public-web research helper. Server-side only: never import this from browser code.
const API_ROOT='https://api.firecrawl.dev/v2';

function apiKey(){return String(process.env.FIRECRAWL_API_KEY||'').trim()}
function clean(value,max=1600){return typeof value==='string'?value.trim().slice(0,max):''}

async function request(path,body){
  const key=apiKey();
  if(!key)return null;
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),30000);
  try{
    const response=await fetch(API_ROOT+path,{
      method:'POST',
      headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},
      body:JSON.stringify(body),
      signal:controller.signal
    });
    const payload=await response.json().catch(()=>({}));
    if(!response.ok||payload.success===false)throw new Error(payload.error||'Firecrawl request failed.');
    return payload.data||payload;
  }finally{clearTimeout(timeout)}
}

function normalizeResult(row){
  const metadata=row&&row.metadata||{};
  return {
    url:clean(row&&row.url||metadata.sourceURL||metadata.url,1200),
    title:clean(row&&row.title||metadata.title,300),
    description:clean(row&&row.description||metadata.description,900),
    markdown:clean(row&&row.markdown,180000),
    links:Array.isArray(row&&row.links)?row.links.filter(x=>typeof x==='string').slice(0,300):[]
  };
}

async function search(query,opts={}){
  const data=await request('/search',{
    query:clean(query,500),
    limit:Math.max(1,Math.min(Number(opts.limit)||5,10)),
    sources:['web'],
    location:clean(opts.location,180)||undefined,
    country:clean(opts.country,2)||undefined,
    safe:true,
    ignoreInvalidURLs:true,
    highlights:false,
    scrapeOptions:{formats:[{type:'markdown'}],onlyMainContent:true}
  });
  if(!data)return [];
  return (Array.isArray(data.web)?data.web:[]).map(normalizeResult).filter(x=>x.url);
}

async function scrape(url){
  if(!/^https?:\/\//i.test(String(url||'')))return null;
  const data=await request('/scrape',{
    url,
    formats:[{type:'markdown'},{type:'links'}],
    onlyMainContent:false,
    onlyCleanContent:false,
    maxAge:172800000,
    timeout:30000,
    blockAds:true
  });
  return data?normalizeResult(data):null;
}

module.exports={enabled:()=>!!apiKey(),search,scrape};
