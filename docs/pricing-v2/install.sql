-- Staged release only. Apply in a transaction before enabling FUSE_PRICING_V2.
-- Existing balances are preserved. Backend service_role is the sole writer.
begin;
create table if not exists public.fuse_credit_wallets(user_id uuid primary key references public.profiles(id),unit_value_ngn numeric not null check(unit_value_ngn>0));
create table if not exists public.fuse_credit_quotes(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),action text not null,recipe jsonb not null,pricing jsonb not null,expires_at timestamptz not null,created_at timestamptz not null default now());
create table if not exists public.fuse_credit_executions(id uuid primary key default gen_random_uuid(),user_id uuid not null references public.profiles(id),quote_id uuid not null unique references public.fuse_credit_quotes(id),request_key uuid not null,status text not null default 'reserved',response jsonb,created_at timestamptz not null default now(),unique(user_id,request_key));
create table if not exists public.fuse_credit_attempts(id uuid primary key default gen_random_uuid(),execution_id uuid not null references public.fuse_credit_executions(id),ordinal integer not null,credits integer not null check(credits>0),provider_quote_usd numeric not null,status text not null default 'prepared',provider_id text unique,actual_usd numeric,refunded_at timestamptz,created_at timestamptz not null default now(),unique(execution_id,ordinal));
create table if not exists public.fuse_credit_receipts(reference text primary key,user_id uuid not null references public.profiles(id),pack text not null,amount_ngn integer not null,credits integer not null,verified_by uuid not null,created_at timestamptz not null default now());
alter table public.fuse_credit_wallets enable row level security;
alter table public.fuse_credit_quotes enable row level security;
alter table public.fuse_credit_executions enable row level security;
alter table public.fuse_credit_attempts enable row level security;
alter table public.fuse_credit_receipts enable row level security;
revoke all on public.fuse_credit_wallets,public.fuse_credit_quotes,public.fuse_credit_executions,public.fuse_credit_attempts,public.fuse_credit_receipts from public,anon,authenticated;
grant all on public.fuse_credit_wallets,public.fuse_credit_quotes,public.fuse_credit_executions,public.fuse_credit_attempts,public.fuse_credit_receipts to service_role;
create or replace function public.fuse_credit_reserve(p_user uuid,p_quote uuid,p_key uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare q fuse_credit_quotes; e fuse_credit_executions; bal integer; unit numeric; n integer; per integer; total integer;
begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 select * into e from fuse_credit_executions where user_id=p_user and (request_key=p_key or quote_id=p_quote);
 if found then return jsonb_build_object('reused',true,'execution',to_jsonb(e),'balance',(select credits from profiles where id=p_user));end if;
 select * into q from fuse_credit_quotes where id=p_quote and user_id=p_user for update;
 if not found or q.expires_at<=now() then raise exception 'QUOTE_EXPIRED';end if;
 select credits into bal from profiles where id=p_user for update;
 if bal is null then raise exception 'ACCOUNT_MISSING';end if;
 insert into fuse_credit_wallets values(p_user,case when bal>0 then 76.9230769231 else 100 end) on conflict do nothing;
 select unit_value_ngn into unit from fuse_credit_wallets where user_id=p_user for update;
 if abs(least(unit,100)-(q.pricing->>'unit_value_ngn')::numeric)>.001 then raise exception 'QUOTE_EXPIRED';end if;
 per:=(q.pricing->>'credits')::integer;n:=(q.recipe->>'count')::integer;total:=per*n;
 if total<=0 or n<1 or n>4 then raise exception 'INVALID_PRICE';end if;
 if bal<total then raise exception 'NO_CREDITS';end if;
 update profiles set credits=credits-total where id=p_user returning credits into bal;
 insert into fuse_credit_executions(user_id,quote_id,request_key) values(p_user,p_quote,p_key) returning * into e;
 insert into fuse_credit_attempts(execution_id,ordinal,credits,provider_quote_usd) select e.id,i,per,(q.pricing->>'provider_usd')::numeric from generate_series(1,n) as i;
 insert into transactions(user_id,delta,reason,meta) values(p_user,-total,'generation',jsonb_build_object('execution_id',e.id,'pricing_version','2026-10-credit-v2'));
 return jsonb_build_object('reused',false,'execution',to_jsonb(e),'balance',bal);
end;$$;
create or replace function public.fuse_credit_refund(p_attempt uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare a fuse_credit_attempts; uid uuid; bal integer;
begin
 select * into a from fuse_credit_attempts where id=p_attempt for update;
 if not found then raise exception 'ATTEMPT_MISSING';end if;
 select user_id into uid from fuse_credit_executions where id=a.execution_id;
 if a.refunded_at is not null then return jsonb_build_object('refunded',false);end if;
 if a.status not in ('prepared','rejected','failed','cancelled') then raise exception 'REFUND_REQUIRES_CONFIRMED_FAILURE';end if;
 update profiles set credits=credits+a.credits where id=uid returning credits into bal;
 update fuse_credit_attempts set refunded_at=now() where id=a.id;
 insert into transactions(user_id,delta,reason,meta) values(uid,a.credits,'refund',jsonb_build_object('attempt_id',a.id));
 return jsonb_build_object('refunded',true,'balance',bal);
end;$$;
create or replace function public.fuse_credit_fulfill(p_user uuid,p_reference text,p_pack text,p_amount integer,p_credits integer,p_verified_by uuid) returns jsonb language plpgsql security invoker set search_path=public as $$
declare bal integer;unit numeric;
begin
 if not exists(select 1 from profiles where id=p_verified_by and is_admin) then raise exception 'ADMIN_REQUIRED';end if;
 if p_amount<=0 or p_credits<=0 or length(trim(p_reference))<3 then raise exception 'INVALID_PAYMENT';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if exists(select 1 from fuse_credit_receipts where reference=p_reference)then return jsonb_build_object('reused',true);end if;
 select credits into bal from profiles where id=p_user for update;if bal is null then raise exception 'ACCOUNT_MISSING';end if;
 insert into fuse_credit_wallets values(p_user,case when bal>0 then 76.9230769231 else 100 end) on conflict do nothing;
 select unit_value_ngn into unit from fuse_credit_wallets where user_id=p_user for update;
 insert into fuse_credit_receipts values(p_reference,p_user,p_pack,p_amount,p_credits,p_verified_by,now());
 update fuse_credit_wallets set unit_value_ngn=(bal*unit+p_credits*100)/(bal+p_credits) where user_id=p_user;
 update profiles set credits=credits+p_credits where id=p_user returning credits into bal;
 insert into transactions(user_id,delta,reason,meta)values(p_user,p_credits,'purchase',jsonb_build_object('reference',p_reference,'pack',p_pack,'source','nestuge-verified'));
 return jsonb_build_object('reused',false,'balance',bal);
end;$$;
revoke all on function public.fuse_credit_reserve(uuid,uuid,uuid),public.fuse_credit_refund(uuid),public.fuse_credit_fulfill(uuid,text,text,integer,integer,uuid) from public,anon,authenticated;
grant execute on function public.fuse_credit_reserve(uuid,uuid,uuid),public.fuse_credit_refund(uuid),public.fuse_credit_fulfill(uuid,text,text,integer,integer,uuid) to service_role;
-- Existing server-only balance mutators must not be callable by browser sessions.
revoke execute on function public.spend_credits(uuid,integer),public.add_credits(uuid,integer,text),public.fulfill_credit_pack_purchase(uuid,text,integer,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.spend_credits(uuid,integer),public.add_credits(uuid,integer,text),public.fulfill_credit_pack_purchase(uuid,text,integer,text,integer,jsonb) to service_role;
commit;
