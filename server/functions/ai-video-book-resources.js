const fs = require('fs');
const path = require('path');
const {admin, getUser, json} = require('./_supabase');

exports.handler = async event => {
  try {
    if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
    const user = await getUser(event);
    if (!user) return json(401,{error:'Please sign in to open these resources.'});
    const db = admin();
    const {data:profile,error:profileError} = await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.is_admin) {
      const {data:unlock,error:unlockError} = await db.from('module_unlocks')
        .select('module_key').eq('user_id',user.id).eq('module_key','ai-video-business-guide').limit(1);
      if (unlockError) throw unlockError;
      if (!unlock?.length) return json(403,{error:'These resources have not been added to your Academy access yet.'});
    }
    const content = JSON.parse(fs.readFileSync(path.join(__dirname,'assets','ai-video-business-resources.json'),'utf8'));
    content.plan = [
      {days:'1–7',focus:'Understand, choose and make one useful video',action:'Explore the ten directions, compare three, choose one buyer or audience and plan a 30-day experiment. Use ChatGPT for direction and eligible Google Flow access or your chosen paid tool to make one short concept. Review and improve it.'},
      {days:'8–14',focus:'Build proof and choose your first income route',action:'Create one or two relevant examples, label concepts honestly and write case studies. Build a simple portfolio or channel concept. Define your offer and calculate costs. Choose client work, audience-building or a product experiment as your main route.'},
      {days:'15–21',focus:'Take your chosen route to market',action:'Client track: research suitable businesses, personalise outreach and record replies. Audience track: publish an original small series and inspect retention and questions. Product track: show a useful preview to potential buyers and validate willingness to pay.'},
      {days:'22–30',focus:'Review evidence and improve the weakest step',action:'Record work completed, meaningful responses, paid outcomes and actual costs. Check targeting if there are no replies; scope and proof if conversations stall; distribution and offer fit if a product attracts no buyers. Change one major variable and plan the next month.'}
    ];
    return json(200,content);
  } catch (error) {
    console.error('ai-video-book-resources failed',error);
    return json(500,{error:'Resources could not load. Please try again.'});
  }
};

