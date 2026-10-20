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
    return json(200,content);
  } catch (error) {
    console.error('ai-video-book-resources failed',error);
    return json(500,{error:'Resources could not load. Please try again.'});
  }
};
