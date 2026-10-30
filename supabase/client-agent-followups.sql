-- Applied through Supabase migration client_agent_automatic_followups.
alter table public.client_prospects add column if not exists conversation_json jsonb not null default '[]'::jsonb;
create table if not exists public.client_agent_followups (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 prospect_id uuid not null references public.client_prospects(id) on delete cascade,
 contact_at timestamptz not null, due_at timestamptz not null,
 status text not null default 'pending' check(status in ('pending','working','delivered','cancelled','failed')),
 attempts integer not null default 0, lease_token uuid, lease_until timestamptz,
 draft jsonb, sent_at timestamptz, provider_id text, last_error text,
 next_attempt_at timestamptz not null default now(), created_at timestamptz not null default now(),
 unique(prospect_id,contact_at)
);
alter table public.client_agent_followups enable row level security;
revoke all on public.client_agent_followups from anon,authenticated;
grant select on public.client_agent_followups to authenticated;
grant all on public.client_agent_followups to service_role;
create policy followups_owner_read on public.client_agent_followups for select to authenticated using ((select auth.uid())=user_id);
create index if not exists client_followups_due on public.client_agent_followups(due_at,next_attempt_at) where status in ('pending','working');
create or replace function public.client_agent_followup_due(at_time timestamptz,days integer) returns timestamptz language plpgsql immutable set search_path=public,pg_temp as $$
declare d date := (at_time at time zone 'Africa/Lagos')::date; n integer:=0;
begin
 while n<days loop d:=d+1; if extract(isodow from d)<6 then n:=n+1; end if; end loop;
 return (d+time '10:00') at time zone 'Africa/Lagos';
end $$;
create or replace function public.client_agent_schedule_followup() returns trigger language plpgsql set search_path=public,pg_temp as $$
declare due timestamptz;
begin
 if new.status not in ('asked','sample_sent','proposal_sent') or (new.reply_text is distinct from old.reply_text and coalesce(new.reply_text,'')<>'') then
  update public.client_agent_followups set status='cancelled',lease_token=null,lease_until=null where prospect_id=new.id and status in ('pending','working');
  update public.client_prospects set next_follow_up=null where id=new.id;
 elsif new.last_contacted_at is distinct from old.last_contacted_at and new.last_contacted_at is not null then
  update public.client_agent_followups set status='cancelled',lease_token=null,lease_until=null where prospect_id=new.id and status in ('pending','working');
  due:=case when coalesce(new.follow_up_count,0)<2 then public.client_agent_followup_due(new.last_contacted_at,case when coalesce(new.follow_up_count,0)=0 then 3 else 5 end) end;
  if new.qualification_json->'reply_assist'->>'based_on_reply_text'=new.reply_text and new.qualification_json->'reply_assist'->>'requested_follow_up_at' is not null then
   begin
    if (new.qualification_json->'reply_assist'->>'requested_follow_up_at')::timestamptz>now() and (new.qualification_json->'reply_assist'->>'requested_follow_up_at')::timestamptz<now()+interval '366 days' and due is not null then
     due:=greatest(due,(new.qualification_json->'reply_assist'->>'requested_follow_up_at')::timestamptz);
    end if;
   exception when invalid_datetime_format or datetime_field_overflow then null;
   end;
  end if;
  if due is not null then insert into public.client_agent_followups(user_id,prospect_id,contact_at,due_at) values(new.user_id,new.id,new.last_contacted_at,due) on conflict do nothing; end if;
  update public.client_prospects set next_follow_up=due where id=new.id;
 end if;
 return new;
end $$;
create trigger client_agent_schedule_followup after update of status,reply_text,last_contacted_at on public.client_prospects for each row execute function public.client_agent_schedule_followup();
create or replace function public.client_agent_record_message(p_user uuid,p_id uuid,p_kind text,p_message text,p_channel text) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare p public.client_prospects; stamp timestamptz:=clock_timestamp(); last_entry jsonb;
begin
 select * into p from public.client_prospects where id=p_id and user_id=p_user for update;
 if not found then raise exception 'Prospect not found'; end if;
 if p_kind not in ('initial','reply','followup','received') or length(trim(p_message))=0 or length(p_message)>8000 then raise exception 'Invalid message'; end if;
 last_entry:=p.conversation_json->-1;
 if last_entry->>'kind'=p_kind and last_entry->>'text'=p_message and (last_entry->>'at')::timestamptz>stamp-interval '1 minute' then return to_jsonb(p); end if;
 if p_kind='followup' and coalesce(p.follow_up_count,0)>=2 then raise exception 'Two follow-ups are already recorded. Wait for a response.'; end if;
 if p.status in ('lost','won','delivered','deposit_paid','in_delivery') and p_kind<>'received' then raise exception 'This prospect is closed or already in delivery.'; end if;
 update public.client_prospects set
  conversation_json=conversation_json||jsonb_build_array(jsonb_build_object('kind',p_kind,'text',p_message,'channel',left(p_channel,30),'at',stamp)),
  reply_text=case when p_kind='received' then p_message else reply_text end,
  replied_at=case when p_kind='received' then stamp else replied_at end,
  status=case when p_kind='received' then 'replied' else 'asked' end,
  last_contacted_at=case when p_kind='received' then last_contacted_at else stamp end,
  follow_up_count=case when p_kind='followup' then coalesce(follow_up_count,0)+1 when p_kind in ('received','reply') then 0 else coalesce(follow_up_count,0) end,
  updated_at=stamp where id=p_id and user_id=p_user;
 select * into p from public.client_prospects where id=p_id; return to_jsonb(p);
end $$;
create or replace function public.client_agent_claim_followup() returns setof public.client_agent_followups language sql set search_path=public,pg_temp as $$
 update public.client_agent_followups set status='working',lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',attempts=attempts+1
 where id=(select id from public.client_agent_followups where due_at<=now() and next_attempt_at<=now() and attempts<4 and (status='pending' or (status='working' and lease_until<now())) order by due_at for update skip locked limit 1) returning *;
$$;
revoke execute on function public.client_agent_record_message(uuid,uuid,text,text,text),public.client_agent_claim_followup() from public,anon,authenticated;
grant execute on function public.client_agent_record_message(uuid,uuid,text,text,text),public.client_agent_claim_followup() to service_role;
-- Extend the existing 15-second scheduler; it only calls Vercel when work is due.
create or replace function public.client_agent_dispatch() returns bigint language plpgsql set search_path=public,pg_temp as $$
declare cfg public.client_agent_worker_config; request_id bigint;
begin
 if not exists(select 1 from public.client_agent_jobs where status not in ('completed','failed') and next_attempt_at<=now() and (lease_until is null or lease_until<now())) and not exists(select 1 from public.client_agent_followups where due_at<=now() and next_attempt_at<=now() and attempts<4 and (status='pending' or (status='working' and lease_until<now()))) then return null; end if;
 update public.client_agent_worker_config set last_dispatch=now() where id=true and last_dispatch<now()-interval '8 seconds' returning * into cfg;
 if not found then return null; end if;
 select net.http_post(url:=cfg.endpoint,headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||cfg.token),body:='{}'::jsonb,timeout_milliseconds:=55000) into request_id;
 return request_id;
end $$;
