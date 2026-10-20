const fs = require('fs');
const path = require('path');
const {admin, getUser, json} = require('./_supabase');

const TOTAL = 45;
const ACCESS_KEY = 'ai-video-business-guide';

exports.handler = async event => {
  try {
    if (event.httpMethod !== 'POST') return json(405, {error:'Method not allowed'});
    const user = await getUser(event);
    if (!user) return json(401, {error:'Please sign in to read this book.'});
    const body = JSON.parse(event.body || '{}');
    const page = Number(body.page);
    if (!Number.isInteger(page) || page < 1 || page > TOTAL) return json(400, {error:'That page is unavailable.'});

    const db = admin();
    const {data:profile,error:profileError} = await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
    if (profileError) throw profileError;
    if (!profile?.is_admin) {
      const {data:unlock,error:unlockError} = await db.from('module_unlocks')
        .select('module_key').eq('user_id',user.id).eq('module_key',ACCESS_KEY).limit(1);
      if (unlockError) throw unlockError;
      if (!unlock?.length) return json(403, {error:'This book has not been added to your Academy access yet.'});
    }

    const filename = path.join(__dirname,'assets','ai-video-book',String(page).padStart(2,'0')+'.webp');
    const image = fs.readFileSync(filename).toString('base64');
    return json(200,{page,total:TOTAL,image:'data:image/webp;base64,'+image});
  } catch (error) {
    console.error('ai-video-book-page failed',error);
    return json(500,{error:'The page could not load. Please try again.'});
  }
};
