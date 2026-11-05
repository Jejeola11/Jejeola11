const {admin,getUser,json}=require('./_supabase');

const MODULES=[
  'Create an Influencer People Remember',
  'Bring Your Influencer to Life',
  'Build Content People Watch and Share',
  'Monetize Your Own AI Influencer',
  'Sell AI Influencers and Content to Businesses',
  'Price, Close and Build Repeat Income'
];

exports.handler=async event=>{
  if(event.httpMethod!=='GET')return json(405,{error:'Method not allowed'});
  try{
    const user=await getUser(event);
    if(!user)return json(401,{error:'Sign in to view this course.'});
    const {data,error}=await admin().from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
    if(error)throw error;
    if(!data?.is_admin)return json(403,{error:'This course is not open for enrolment yet.'});
    return json(200,{title:'Create & Monetize Viral AI Influencers',modules:MODULES.map((title,index)=>({number:index+1,title,status:'Video coming soon'}))});
  }catch(error){console.error('[Influencer course]',error.message);return json(500,{error:'Could not load this course. Please try again.'});}
};
