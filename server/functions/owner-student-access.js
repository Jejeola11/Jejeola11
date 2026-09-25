const { admin, getUser, json } = require('./_supabase');

const OWNER_EMAIL='riadigitals0@gmail.com';

const PLAYBOOK_KEY='first-client-playbook';

const ACCESS_KEYS={
  playbook:['first-client-playbook'],
  design:['flyer-m1','flyer-m2','flyer-m3','flyer-m4','flyer-m5','flyer-m6'],
  video:['aiv-m1','aiv-m2','aiv-m3','aiv-m4','aiv-m5','aiv-m6','aiv-m7','aiv-m8','aiv-m9','aiv-m10','aiv-m11','aiv-m12','aiv-m13','aiv-m14','aiv-m15','aiv-m16'],
  landing:['web-m1','web-m2','web-m3-current','web-m4','web-m5','web-m6','web-m7','web-m8','web-m9','web-m10'],
  money:['money']
};

async function requireOwner(event){
  const user=await getUser(event);
  if(!user)return {error:json(401,{error:'Please sign in again.'})};
  if(String(user.email||'').trim().toLowerCase()!==OWNER_EMAIL)return {error:json(403,{error:'Owner access only.'})};
  return {user};
}

async function findAuthUserByEmail(db,email){
  for(let page=1;page<=10;page++){
    const {data,error}=await db.auth.admin.listUsers({page,perPage:1000});
    if(error)throw error;
    const found=(data?.users||[]).find(u=>String(u.email||'').trim().toLowerCase()===email);
    if(found)return found;
    if((data?.users||[]).length<1000)break;
  }
  return null;
}

async function ensureStudent(db,email){
  const {data:rows,error:profileError}=await db.from('profiles').select('id,email,credits').ilike('email',email).limit(1);
  if(profileError)throw profileError;
  if(rows&&rows[0])return {profile:rows[0],created:false};

  let authUser=await findAuthUserByEmail(db,email);
  let created=false;
  if(!authUser){
    const {data,error}=await db.auth.admin.createUser({email,email_confirm:true,user_metadata:{source:'fuse-operations'}});
    if(error)throw error;
    authUser=data.user;
    created=true;
  }
  if(!authUser)throw new Error('Could not create student account.');

  const {error:insertError}=await db.from('profiles').insert({id:authUser.id,email}).select().maybeSingle();
  if(insertError && !String(insertError.message||'').toLowerCase().includes('duplicate'))throw insertError;

  const {data:profile,error}=await db.from('profiles').select('id,email,credits').eq('id',authUser.id).maybeSingle();
  if(error)throw error;
  if(!profile)throw new Error('Student profile could not be prepared.');
  return {profile,created};
}

function summarizeAccess(unlocks){
  const owned=new Set(unlocks||[]);
  if(owned.has('atelier-full')||owned.has('atelier-empire'))return ['All four Academy courses'];
  const out=[];
  if(owned.has('first-client-playbook'))out.push('First Client Playbook');
  if(ACCESS_KEYS.design.some(k=>owned.has(k)))out.push('Design & Flyers');
  if(ACCESS_KEYS.video.some(k=>owned.has(k)))out.push('AI UGC & Influencer');
  if(ACCESS_KEYS.landing.some(k=>owned.has(k)))out.push('Landing Page Design');
  if(ACCESS_KEYS.money.some(k=>owned.has(k)))out.push('Money Engine');
  return out;
}

async function readStudent(db,target){
  const {data:profile,error:profileError}=await db.from('profiles').select('id,email,credits').eq('id',target.id).maybeSingle();
  if(profileError)throw profileError;
  const {data:unlocks,error:unlockError}=await db.from('module_unlocks').select('module_key').eq('user_id',target.id);
  if(unlockError)throw unlockError;
  return {
    email:profile?.email||target.email,
    credits:profile?.credits||0,
    courses:summarizeAccess((unlocks||[]).map(r=>r.module_key))
  };
}

exports.handler=async event=>{
  try{
    if(event.httpMethod!=='POST')return json(405,{error:'Method not allowed'});
    const owner=await requireOwner(event);
    if(owner.error)return owner.error;
    let body={};try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Bad request'})}
    const action=String(body.action||'lookup');
    const email=String(body.email||'').trim().toLowerCase();
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return json(400,{error:'Enter a valid student email.'});

    const db=admin();

    if(action==='lookup'){
      const {data:rows,error}=await db.from('profiles').select('id,email,credits').ilike('email',email).limit(1);
      if(error)throw error;
      const target=rows&&rows[0];
      if(!target)return json(404,{error:'No student account with that email yet.'});
      return json(200,{ok:true,...await readStudent(db,target)});
    }

    if(action!=='grant')return json(400,{error:'Unknown action.'});

    const courses=Array.isArray(body.courses)?body.courses.map(String):[];
    const credits=Math.max(0,parseInt(body.credits,10)||0);
    if(!courses.length&&credits<=0)return json(400,{error:'Choose an access item or add credits.'});

    const playbookOnly=courses.includes('playbook');
    if(playbookOnly&&(courses.length!==1||credits!==0)){
      return json(400,{error:'Playbook access is separate: select only the Playbook and leave credits at 0.'});
    }

    const {profile:target,created}=await ensureStudent(db,email);

    if(playbookOnly){
      const {error:removeError}=await db.from('module_unlocks').delete().eq('user_id',target.id).neq('module_key',PLAYBOOK_KEY);
      if(removeError)throw removeError;
      const {data:existing,error:existingError}=await db.from('module_unlocks').select('module_key').eq('user_id',target.id);
      if(existingError)throw existingError;
      if(!(existing||[]).some(row=>row.module_key===PLAYBOOK_KEY)){
        const {error:insertError}=await db.from('module_unlocks').insert({user_id:target.id,module_key:PLAYBOOK_KEY});
        if(insertError)throw insertError;
      }
      const {error:creditResetError}=await db.from('profiles').update({credits:0}).eq('id',target.id);
      if(creditResetError)throw creditResetError;
      return json(200,{ok:true,created,...await readStudent(db,target)});
    }

    let keys=[];
    if(courses.includes('all')){
      keys=['atelier-full',PLAYBOOK_KEY];
    }else{
      for(const course of courses){
        if(ACCESS_KEYS[course])keys.push(...ACCESS_KEYS[course]);
      }
      if(courses.includes('money'))keys.push(PLAYBOOK_KEY);
    }
    keys=[...new Set(keys)];

    if(keys.length){
      const {data:existing,error:existingError}=await db.from('module_unlocks').select('module_key').eq('user_id',target.id);
      if(existingError)throw existingError;
      const owned=new Set((existing||[]).map(r=>r.module_key));
      const missing=keys.filter(k=>!owned.has(k)).map(module_key=>({user_id:target.id,module_key}));
      if(missing.length){
        const {error:insertError}=await db.from('module_unlocks').insert(missing);
        if(insertError)throw insertError;
      }
    }

    if(credits>0){
      const {error:creditError}=await db.rpc('add_credits',{uid:target.id,amount:credits,why:'fuse-operations'});
      if(creditError)throw creditError;
    }

    return json(200,{ok:true,created,...await readStudent(db,target)});
  }catch(e){
    console.error('owner-student-access failed',e);
    return json(500,{error:(e&&e.message)||'Could not update student access.'});
  }
};