-- Three verified prospect target; reserve 18 credits at six credits per saved result.
CREATE OR REPLACE FUNCTION public.client_agent_start(p_user uuid, p_key uuid, p_profile jsonb, p_market text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.client_agent_jobs; bal integer;
begin
  select credits into bal from public.profiles where id=p_user for update;
  if not found then raise exception 'Account not found'; end if;
  select * into j from public.client_agent_jobs where user_id=p_user and request_key=p_key;
  if found then return jsonb_build_object('job',to_jsonb(j),'credits',bal,'reused',true); end if;
  select * into j from public.client_agent_jobs where user_id=p_user and status not in ('completed','failed') limit 1;
  if found then return jsonb_build_object('job',to_jsonb(j),'credits',bal,'reused',true); end if;
  if coalesce(bal,0)<18 then raise exception 'You need 18 credits to research up to three prospects.'; end if;
  if (select count(*) from public.client_agent_jobs where user_id=p_user and created_at>now()-interval '1 hour')>=6 then raise exception 'Please allow your current research to settle before starting more searches.'; end if;
  update public.profiles set credits=credits-18 where id=p_user returning credits into bal;
  insert into public.client_agent_jobs(user_id,request_key,profile_snapshot,market,credits_charged) values(p_user,p_key,p_profile,p_market,18) returning * into j;
  insert into public.credit_ledger(user_id,amount,balance_after,reason) values(p_user,-18,bal,'client_agent_research:'||j.id::text);
  return jsonb_build_object('job',to_jsonb(j),'credits',bal,'reused',false);
end $function$
;

CREATE OR REPLACE FUNCTION public.client_agent_finish(p_id uuid, p_lease uuid, p_rows jsonb, p_error text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare j public.client_agent_jobs; n integer; refund integer; bal integer;
begin
  select * into j from public.client_agent_jobs where id=p_id for update;
  if not found then raise exception 'Research not found'; end if;
  if j.status in ('completed','failed') then return jsonb_build_object('already_finished',true); end if;
  if j.lease_token is distinct from p_lease then raise exception 'Research lease expired'; end if;
  n=least(3,jsonb_array_length(p_rows));
  if n>0 then
    insert into public.client_prospects(user_id,brand_name,niche,location,website,contact_name,email,whatsapp,instagram,founder_name,founder_title,founder_linkedin,current_activity,current_activity_url,visible_problem,service,offer_price,offer_currency,source,source_links,qualification_json,pitch_email,pitch_instagram,pitch_linkedin,portfolio_url,research_date,opportunity_score,status)
    select j.user_id,r.brand_name,r.niche,r.location,r.website,r.contact_name,r.email,r.whatsapp,r.instagram,r.founder_name,r.founder_title,r.founder_linkedin,r.current_activity,r.current_activity_url,r.visible_problem,r.service,r.offer_price,r.offer_currency,'Fuse Client Agent v2',r.source_links,r.qualification_json,r.pitch_email,r.pitch_instagram,r.pitch_linkedin,r.portfolio_url,now(),r.opportunity_score,'new'
    from jsonb_to_recordset(p_rows) as r(brand_name text,niche text,location text,website text,contact_name text,email text,whatsapp text,instagram text,founder_name text,founder_title text,founder_linkedin text,current_activity text,current_activity_url text,visible_problem text,service text,offer_price numeric,offer_currency text,source_links jsonb,qualification_json jsonb,pitch_email text,pitch_instagram text,pitch_linkedin text,portfolio_url text,opportunity_score integer) limit 3;
  end if;
  refund=j.credits_charged-(n*6);
  if refund>0 then
    update public.profiles set credits=credits+refund where id=j.user_id returning credits into bal;
    insert into public.credit_ledger(user_id,amount,balance_after,reason) values(j.user_id,refund,bal,'client_agent_research_refund:'||j.id::text);
  end if;
  update public.client_agent_jobs set status=case when p_error is null then 'completed' else 'failed' end,
    result_count=n,credits_refunded=refund,completed_at=now(),updated_at=now(),lease_until=null,lease_token=null,
    message=case when p_error is not null then p_error when n=3 then 'Three researched prospects are ready.' else n::text||' prospects met the evidence standard. Unused credits were returned.' end,
    last_error=p_error where id=p_id;
  return jsonb_build_object('count',n,'refund',refund);
end $function$
;

