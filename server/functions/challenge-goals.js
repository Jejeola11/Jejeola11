const {admin,getUser,json}=require('./_supabase');

exports.handler=async event=>{
  try{
    if(!['GET','POST'].includes(event.httpMethod))return json(405,{error:'Method not allowed.'});
    const user=await getUser(event);
    if(!user)return json(401,{error:'Please sign in again.'});
    const db=admin();
    const {data:profile,error:profileError}=await db.from('profiles').select('is_admin').eq('id',user.id).maybeSingle();
    if(profileError)throw profileError;
    const isAdmin=!!profile?.is_admin;
    const {data:enrollment,error:enrollmentError}=await db.from('module_unlocks').select('module_key').eq('user_id',user.id).eq('module_key','ai-video-client-challenge').limit(1);
    if(enrollmentError)throw enrollmentError;
    if(!isAdmin&&!enrollment?.length)return json(403,{error:'Challenge access required.'});
    if(event.httpMethod==='GET'&&event.queryStringParameters?.view==='admin'){
      if(!isAdmin)return json(403,{error:'Admin access required.'});
      const {data,error}=await db.from('challenge_start_goals').select('user_id,goal,updated_at').order('updated_at',{ascending:false}).limit(500);
      if(error)throw error;
      const ids=(data||[]).map(row=>row.user_id);
      const {data:profiles,error:peopleError}=ids.length?await db.from('profiles').select('id,email').in('id',ids):{data:[],error:null};
      if(peopleError)throw peopleError;
      const emails=new Map((profiles||[]).map(row=>[row.id,row.email]));
      return json(200,{goals:(data||[]).map(row=>({...row,email:emails.get(row.user_id)||''}))});
    }
    if(event.httpMethod==='GET'){
      const {data,error}=await db.from('challenge_start_goals').select('goal,updated_at').eq('user_id',user.id).maybeSingle();
      if(error)throw error;
      return json(200,{goal:data?.goal||'',updated_at:data?.updated_at||null});
    }
    let body;try{body=JSON.parse(event.body||'{}')}catch{return json(400,{error:'Invalid request.'})}
    const goal=String(body.goal||'').trim();
    if(!goal||goal.length>600)return json(400,{error:'Write a goal of up to 600 characters.'});
    const {data,error}=await db.from('challenge_start_goals').upsert({user_id:user.id,goal,updated_at:new Date().toISOString()},{onConflict:'user_id'}).select('goal,updated_at').single();
    if(error)throw error;
    return json(200,{goal:data.goal,updated_at:data.updated_at});
  }catch(error){console.error('challenge-goals',error);return json(500,{error:'Could not save or load the challenge goal.'})}
};
