const {admin,getUser,json}=require('./_supabase');
const crypto=require('crypto');
const bad=(message,code=400)=>json(code,{error:message});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeUrl=value=>{try{const u=new URL(String(value));return u.protocol==='https:'&&u.username===''&&u.password===''&&u.href.length<=1000?u.href:null}catch{return null}};
async function owner(db,id){const {data}=await db.from('profiles').select('is_admin').eq('id',id).single();return data?.is_admin===true}
async function state(db,user){
 const id=user.id;
 const expired=await db.from('fuse_contests').select('id').eq('status','open').lte('voting_closes_at',new Date().toISOString()).limit(30);
 if(expired.error)throw expired.error;
 for(const c of expired.data||[]){const r=await db.rpc('finalize_fuse_contest',{p_contest_id:c.id});if(r.error)throw r.error;}
 const isOwner=await owner(db,id);
 const [profile,refs,commissions,contests,entries,votes]=await Promise.all([
  db.from('profiles').select('referral_code,credits,created_at,email').eq('id',id).single(),
  db.from('fuse_referrals').select('referred_user_id').eq('referrer_user_id',id),
  db.from('fuse_referral_commissions').select('amount_naira,commission_naira,status,created_at').eq('referrer_user_id',id).order('created_at',{ascending:false}).limit(100),
  db.from('fuse_contests').select('id,title,brief,prize_naira,opens_at,closes_at,voting_closes_at,status').neq('status','draft').order('created_at',{ascending:false}).limit(30),
  db.from('fuse_contest_entries').select('id,contest_id,creator_user_id,video_url,caption,status,created_at').in('status',['approved','winner']).order('created_at',{ascending:true}).limit(300),
  db.rpc('fuse_contest_vote_counts')
 ]);
 for(const r of [profile,refs,commissions,contests,entries,votes])if(r.error)throw r.error;
 const referral=await db.from('fuse_referrals').select('referrer_user_id').eq('referred_user_id',id).maybeSingle();if(referral.error)throw referral.error;
 const priorPurchase=await db.from('payments').select('id').eq('user_id',id).in('status',['manual','success']).in('pack',['credits-v2-trial','credits-v2-mini','credits-v2-creator','credits-v2-studio','credits-v2-pro','credits-v2-agency','starter','mini','creator','studio','pro','power']).limit(1);if(priorPurchase.error)throw priorPurchase.error;
 const joinedAt=new Date(profile.data?.created_at||0).getTime();const expiresAt=joinedAt+24*3600000;
 const discountExpiresAt=referral.data&&!priorPurchase.data?.length&&joinedAt&&Date.now()<expiresAt?new Date(expiresAt).toISOString():null;
 const count=new Map();for(const vote of votes.data||[])count.set(vote.entry_id,Number(vote.vote_count));
 const pending=isOwner?(await db.from('fuse_contest_entries').select('id,contest_id,video_url,caption,created_at').eq('status','pending').order('created_at',{ascending:true}).limit(100)).data||[]:[];
 return {isOwner,pending,discountExpiresAt,code:profile.data?.referral_code||null,credits:profile.data?.credits||0,signups:refs.data?.length||0,commissions:commissions.data||[],contests:(contests.data||[]).map(c=>({...c,entries:(entries.data||[]).filter(e=>e.contest_id===c.id).map(e=>({...e,votes:count.get(e.id)||0})).sort((a,b)=>b.votes-a.votes||a.id-b.id)})),myVotes:(await db.from('fuse_contest_votes').select('contest_id').eq('voter_user_id',id)).data?.map(v=>v.contest_id)||[],myEntries:(await db.from('fuse_contest_entries').select('id,contest_id,status,video_url').eq('creator_user_id',id)).data||[]};
}
exports.handler=async event=>{
 if(!['GET','POST'].includes(event.httpMethod))return bad('Method not allowed',405);
 try{
  if(event.httpMethod==='GET'&&event.queryStringParameters?.ref){
   const code=String(event.queryStringParameters.ref).trim().toLowerCase();
   if(!/^[a-z0-9-]{5,80}$/.test(code))return bad('Referral link is invalid.');
   const db=admin(),ip=String(event.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
   const visitorHash=crypto.createHash('sha256').update(ip+process.env.SUPABASE_SERVICE_ROLE_KEY).digest('hex');
   const {count,error:limitError}=await db.from('fuse_referral_clicks').select('token',{count:'exact',head:true}).eq('visitor_hash',visitorHash).gte('clicked_at',new Date(Date.now()-3600000).toISOString());
   if(limitError)throw limitError;if(count>=20)return bad('Please wait before opening another referral link.',429);
   const {data:referrer,error:codeError}=await db.from('profiles').select('id').eq('referral_code',code).maybeSingle();if(codeError)throw codeError;if(!referrer)return bad('Referral link is not available.',404);
   const token=crypto.randomUUID();const {error:clickError}=await db.from('fuse_referral_clicks').insert({token,referrer_user_id:referrer.id,code,visitor_hash:visitorHash});if(clickError)throw clickError;
   return json(200,{token});
  }
  const user=await getUser(event);if(!user)return bad('Sign up to enter Fuse Earn.',401);
  const db=admin();if(event.httpMethod==='GET')return json(200,await state(db,user));
  const b=JSON.parse(event.body||'{}');
  if(b.action==='claim'){
   const token=String(b.token||'').trim();if(!uuid.test(token))return bad('Invalid referral visit.');
   const {data,error}=await db.rpc('claim_fuse_referral_click',{p_user_id:user.id,p_token:token});if(error)throw error;
   return json(200,{claimed:data===true});
  }
  if(b.action==='record_course_payment'){
   if(!await owner(db,user.id))return bad('Owner access required.',403);
   const email=String(b.email||'').trim().toLowerCase(),reference=String(b.reference||'').trim(),pack=String(b.pack||''),amount=Number(b.amount_naira);
   if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!/^[-a-zA-Z0-9_:]{6,120}$/.test(reference)||!['design','video','landing','money','ebook','challenge','atelier-lane-a'].includes(pack)||!Number.isSafeInteger(amount)||amount<1||amount>1000000||b.confirmed!==true)return bad('Confirm the external payment and enter the buyer, course, amount paid and unique receipt reference.');
   const buyer=await db.from('profiles').select('id').eq('email',email).maybeSingle();if(buyer.error)throw buyer.error;if(!buyer.data)return bad('Buyer account was not found.',404);
   const {error}=await db.from('payments').insert({user_id:buyer.data.id,reference,pack,amount_naira:amount,credits_added:0,status:'manual',raw:{source:'owner-verified-course-payment',recorded_by:user.id}});
   if(error?.code==='23505')return bad('This receipt was already recorded.',409);if(error)throw error;
   return json(200,{ok:true});
  }
  if(b.action==='create_contest'){
   if(!await owner(db,user.id))return bad('Owner access required.',403);
   const title=String(b.title||'').trim(),brief=String(b.brief||'').trim(),prize=Number(b.prize_naira);
   const close=new Date(b.closes_at),voting=new Date(b.voting_closes_at);
   if(title.length<3||title.length>120||brief.length<20||brief.length>5000||!Number.isSafeInteger(prize)||prize<1||!Number.isFinite(close.getTime())||close<=new Date()||!Number.isFinite(voting.getTime())||voting<close)return bad('Enter a title, detailed brief, cash prize, entry deadline and later voting deadline.');
   const {error}=await db.from('fuse_contests').insert({title,brief,prize_naira:prize,closes_at:close.toISOString(),voting_closes_at:voting.toISOString(),status:'open'});if(error)throw error;return json(200,{ok:true});
  }
  if(b.action==='submit'){
   const contestId=Number(b.contest_id),url=safeUrl(b.video_url),caption=String(b.caption||'').trim();
   if(!Number.isSafeInteger(contestId)||!url||caption.length>500)return bad('Add a public HTTPS video link and a short caption.');
   const {data:c,error:e}=await db.from('fuse_contests').select('id,opens_at,closes_at,status').eq('id',contestId).maybeSingle();if(e)throw e;
   if(!c||c.status!=='open'||new Date(c.opens_at)>new Date()||new Date(c.closes_at)<=new Date())return bad('Entries are closed.');
   const {error}=await db.from('fuse_contest_entries').insert({contest_id:contestId,creator_user_id:user.id,video_url:url,caption});
   if(error?.code==='23505')return bad('You already entered this contest.');if(error)throw error;return json(200,{ok:true});
  }
  if(b.action==='vote'){
   const entryId=Number(b.entry_id);if(!Number.isSafeInteger(entryId))return bad('Invalid entry.');
   const {data:e,error:ee}=await db.from('fuse_contest_entries').select('id,contest_id,creator_user_id,status').eq('id',entryId).maybeSingle();if(ee)throw ee;
   if(!e||e.status!=='approved')return bad('This video is not open for votes.');
   if(e.creator_user_id===user.id)return bad('You cannot vote for your own entry.');
   const {data:c,error:ce}=await db.from('fuse_contests').select('status,opens_at,voting_closes_at').eq('id',e.contest_id).single();if(ce)throw ce;
   if(c.status!=='open'||new Date(c.opens_at)>new Date()||new Date(c.voting_closes_at)<=new Date())return bad('Voting is closed.');
   const {error}=await db.from('fuse_contest_votes').insert({contest_id:e.contest_id,entry_id:e.id,voter_user_id:user.id});
   if(error?.code==='23505')return bad('You already voted in this contest.');if(error)throw error;return json(200,{ok:true});
  }
  if(b.action==='approve_entry'){
   if(!await owner(db,user.id))return bad('Owner access required.',403);
   const entryId=Number(b.entry_id);if(!Number.isSafeInteger(entryId)||!['approved','rejected'].includes(b.status))return bad('Invalid review.');
   const {error}=await db.from('fuse_contest_entries').update({status:b.status}).eq('id',entryId).eq('status','pending');if(error)throw error;return json(200,{ok:true});
  }
  return bad('Unknown action.');
 }catch(err){console.error('[fuse-earn]',err);return bad('Could not complete this action. Please try again.',500)}
};
