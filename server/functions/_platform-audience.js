// Stores account contacts without changing existing marketing preferences.
async function captureSignup(db,{id,email,name}){
 const normalized=String(email||'').trim().toLowerCase();
 if(!id||!normalized)throw new Error('Missing signup identity');
 const saved=await db.from('audience_contacts').upsert({email_normalized:normalized,first_name:String(name||normalized.split('@')[0]).trim().slice(0,80),email_marketing_status:'unknown'},{onConflict:'email_normalized',ignoreDuplicates:true});if(saved.error)throw saved.error;
 const {data:contact,error}=await db.from('audience_contacts').select('id,email_marketing_status').eq('email_normalized',normalized).single();if(error)throw error;
 const source=await db.from('audience_contact_sources').upsert({contact_id:contact.id,source:'fuse_platform_signup',source_record_id:id},{onConflict:'contact_id,source,source_record_id',ignoreDuplicates:true});if(source.error)throw source.error;
 return contact;
}
module.exports={captureSignup};
