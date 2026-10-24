-- Additive Client Agent v2 queue. Existing prospects and course access are preserved.
create extension if not exists pg_cron;

create table public.client_agent_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_key uuid not null,
  status text not null default 'queued' check(status in ('queued','searching','verifying','drafting','completed','failed')),
  profile_snapshot jsonb not null,
  market text not null,
  requested_count integer not null default 5 check(requested_count=5),
  credits_charged integer not null default 30,
  credits_refunded integer not null default 0,
  result_count integer not null default 0,
  response_id text,
  candidates jsonb not null default '[]',
  verified jsonb not null default '[]',
  cursor integer not null default 0,
  attempts integer not null default 0,
  last_error text,
  message text not null default 'Your research is queued.',
  next_attempt_at timestamptz not null default now(),
  lease_until timestamptz,
  lease_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  unique(user_id,request_key)
);
create index client_agent_jobs_user_created on public.client_agent_jobs(user_id,created_at desc);
create index client_agent_jobs_due on public.client_agent_jobs(next_attempt_at) where status not in ('completed','failed');
create unique index client_agent_jobs_one_active on public.client_agent_jobs(user_id) where status not in ('completed','failed');
alter table public.client_agent_jobs enable row level security;
create policy client_agent_jobs_read_own on public.client_agent_jobs for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.client_agent_jobs from anon,authenticated;
grant select on public.client_agent_jobs to authenticated;
grant all on public.client_agent_jobs to service_role;

create table public.client_agent_worker_config (
  id boolean primary key default true check(id),
  token text not null,
  endpoint text not null,
  last_dispatch timestamptz not null default 'epoch'
);
alter table public.client_agent_worker_config enable row level security;
revoke all on public.client_agent_worker_config from public,anon,authenticated;
grant all on public.client_agent_worker_config to service_role;
insert into public.client_agent_worker_config(id,token,endpoint)
values(true,replace(gen_random_uuid()::text||gen_random_uuid()::text,'-',''),'https://fuseatelier.com/api/client-agent-worker');

-- Only the server role can reserve credits or mutate queue state.
create function public.client_agent_start(p_user uuid,p_key uuid,p_profile jsonb,p_market text)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.client_agent_jobs; bal integer;
begin
  select credits into bal from public.profiles where id=p_user for update;
  if not found then raise exception 'Account not found'; end if;
  select * into j from public.client_agent_jobs where user_id=p_user and request_key=p_key;
  if found then return jsonb_build_object('job',to_jsonb(j),'credits',bal,'reused',true); end if;
  select * into j from public.client_agent_jobs where user_id=p_user and status not in ('completed','failed') limit 1;
  if found then return jsonb_build_object('job',to_jsonb(j),'credits',bal,'reused',true); end if;
  if coalesce(bal,0)<30 then raise exception 'You need 30 credits to research up to five prospects.'; end if;
  if (select count(*) from public.client_agent_jobs where user_id=p_user and created_at>now()-interval '1 hour')>=6 then raise exception 'Please allow your current research to settle before starting more searches.'; end if;
  update public.profiles set credits=credits-30 where id=p_user returning credits into bal;
  insert into public.client_agent_jobs(user_id,request_key,profile_snapshot,market) values(p_user,p_key,p_profile,p_market) returning * into j;
  insert into public.credit_ledger(user_id,amount,balance_after,reason) values(p_user,-30,bal,'client_agent_research:'||j.id::text);
  return jsonb_build_object('job',to_jsonb(j),'credits',bal,'reused',false);
end $$;
revoke all on function public.client_agent_start(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.client_agent_start(uuid,uuid,jsonb,text) to service_role;

create function public.client_agent_claim(p_id uuid default null)
returns setof public.client_agent_jobs language sql security invoker set search_path=public,pg_temp as $$
  update public.client_agent_jobs set lease_until=now()+interval '70 seconds',lease_token=gen_random_uuid(),updated_at=now()
  where id=(select id from public.client_agent_jobs where status not in ('completed','failed')
    and next_attempt_at<=now() and (lease_until is null or lease_until<now()) and (p_id is null or id=p_id)
    order by next_attempt_at,created_at limit 1 for update skip locked)
  returning *;
$$;
revoke all on function public.client_agent_claim(uuid) from public,anon,authenticated;
grant execute on function public.client_agent_claim(uuid) to service_role;

create function public.client_agent_finish(p_id uuid,p_lease uuid,p_rows jsonb,p_error text default null)
returns jsonb language plpgsql security invoker set search_path=public,pg_temp as $$
declare j public.client_agent_jobs; n integer; refund integer; bal integer;
begin
  select * into j from public.client_agent_jobs where id=p_id for update;
  if not found then raise exception 'Research not found'; end if;
  if j.status in ('completed','failed') then return jsonb_build_object('already_finished',true); end if;
  if j.lease_token is distinct from p_lease then raise exception 'Research lease expired'; end if;
  n=least(5,jsonb_array_length(p_rows));
  if n>0 then
    insert into public.client_prospects(user_id,brand_name,niche,location,website,contact_name,email,whatsapp,instagram,founder_name,founder_title,founder_linkedin,current_activity,current_activity_url,visible_problem,service,offer_price,offer_currency,source,source_links,qualification_json,pitch_email,pitch_instagram,pitch_linkedin,portfolio_url,research_date,opportunity_score,status)
    select j.user_id,r.brand_name,r.niche,r.location,r.website,r.contact_name,r.email,r.whatsapp,r.instagram,r.founder_name,r.founder_title,r.founder_linkedin,r.current_activity,r.current_activity_url,r.visible_problem,r.service,r.offer_price,r.offer_currency,'Fuse Client Agent v2',r.source_links,r.qualification_json,r.pitch_email,r.pitch_instagram,r.pitch_linkedin,r.portfolio_url,now(),r.opportunity_score,'new'
    from jsonb_to_recordset(p_rows) as r(brand_name text,niche text,location text,website text,contact_name text,email text,whatsapp text,instagram text,founder_name text,founder_title text,founder_linkedin text,current_activity text,current_activity_url text,visible_problem text,service text,offer_price numeric,offer_currency text,source_links jsonb,qualification_json jsonb,pitch_email text,pitch_instagram text,pitch_linkedin text,portfolio_url text,opportunity_score integer);
  end if;
  refund=j.credits_charged-(n*6);
  if refund>0 then
    update public.profiles set credits=credits+refund where id=j.user_id returning credits into bal;
    insert into public.credit_ledger(user_id,amount,balance_after,reason) values(j.user_id,refund,bal,'client_agent_research_refund:'||j.id::text);
  end if;
  update public.client_agent_jobs set status=case when p_error is null then 'completed' else 'failed' end,
    result_count=n,credits_refunded=refund,completed_at=now(),updated_at=now(),lease_until=null,lease_token=null,
    message=case when p_error is not null then p_error when n=5 then 'Five researched prospects are ready.' else n::text||' prospects met the evidence standard. Unused credits were returned.' end,
    last_error=p_error where id=p_id;
  return jsonb_build_object('count',n,'refund',refund);
end $$;
revoke all on function public.client_agent_finish(uuid,uuid,jsonb,text) from public,anon,authenticated;
grant execute on function public.client_agent_finish(uuid,uuid,jsonb,text) to service_role;

-- Scheduler calls only this dedicated endpoint, using a generated, server-only token.
create function public.client_agent_dispatch() returns bigint language plpgsql security invoker set search_path=public,pg_temp as $$
declare cfg public.client_agent_worker_config; request_id bigint;
begin
  if not exists(select 1 from public.client_agent_jobs where status not in ('completed','failed') and next_attempt_at<=now() and (lease_until is null or lease_until<now())) then return null; end if;
  update public.client_agent_worker_config set last_dispatch=now() where id=true and last_dispatch<now()-interval '8 seconds' returning * into cfg;
  if not found then return null; end if;
  select net.http_post(url:=cfg.endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||cfg.token),body:='{}'::jsonb,timeout_milliseconds:=55000) into request_id;
  return request_id;
end $$;
revoke all on function public.client_agent_dispatch() from public,anon,authenticated;
grant execute on function public.client_agent_dispatch() to service_role;
select cron.schedule('fuse-client-agent-worker','15 seconds','select public.client_agent_dispatch()');
