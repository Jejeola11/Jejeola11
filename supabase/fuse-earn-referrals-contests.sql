-- Fuse Earn 2026-10-31: a separate credit-pack referral program and moderated cash contests.
-- The older Fuse Core affiliate tables remain untouched.
create table if not exists public.fuse_referrals (
  referred_user_id uuid primary key references auth.users(id) on delete cascade,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  code text not null,
  signed_up_at timestamptz not null default now(),
  check (referred_user_id <> referrer_user_id)
);
create index if not exists fuse_referrals_referrer_idx on public.fuse_referrals(referrer_user_id);
create table if not exists public.fuse_referral_clicks (
 token uuid primary key default gen_random_uuid(),
 referrer_user_id uuid not null references auth.users(id) on delete cascade,
 code text not null,
 visitor_hash text not null,
 clicked_at timestamptz not null default now(),
 claimed_by uuid unique references auth.users(id) on delete set null
);
create index if not exists fuse_clicks_visitor_idx on public.fuse_referral_clicks(visitor_hash,clicked_at);
alter table public.fuse_referral_clicks enable row level security;
revoke all on public.fuse_referral_clicks from anon,authenticated;
grant all on public.fuse_referral_clicks to service_role;

create table if not exists public.fuse_referral_commissions (
  payment_id bigint primary key references public.payments(id) on delete restrict,
  referrer_user_id uuid not null references auth.users(id) on delete cascade,
  referred_user_id uuid not null references auth.users(id) on delete cascade,
  amount_naira integer not null check (amount_naira > 0),
  commission_naira integer not null check (commission_naira > 0),
  status text not null default 'pending' check (status in ('pending','approved','paid','reversed')),
  created_at timestamptz not null default now()
);
create index if not exists fuse_commissions_referrer_idx on public.fuse_referral_commissions(referrer_user_id);
create table if not exists public.fuse_contests (
  id bigint generated always as identity primary key,
  title text not null check(length(title) between 3 and 120),
  brief text not null check(length(brief) between 20 and 5000),
  prize_naira integer not null check(prize_naira > 0),
  opens_at timestamptz not null default now(),
  closes_at timestamptz not null,
  voting_closes_at timestamptz not null,
  status text not null default 'draft' check(status in ('draft','open','closed','awarded','cancelled')),
  created_at timestamptz not null default now(),
  check(voting_closes_at >= closes_at and closes_at > opens_at)
);
create table if not exists public.fuse_contest_entries (
  id bigint generated always as identity primary key,
  contest_id bigint not null references public.fuse_contests(id) on delete cascade,
  creator_user_id uuid not null references auth.users(id) on delete cascade,
  video_url text not null check(length(video_url) between 12 and 1000),
  caption text not null default '' check(length(caption) <= 500),
  status text not null default 'pending' check(status in ('pending','approved','rejected','winner')),
  created_at timestamptz not null default now(),
  unique(contest_id,creator_user_id)
);
create table if not exists public.fuse_contest_votes (
  contest_id bigint not null references public.fuse_contests(id) on delete cascade,
  entry_id bigint not null references public.fuse_contest_entries(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(contest_id,voter_user_id)
);
create index if not exists fuse_votes_entry_idx on public.fuse_contest_votes(entry_id);

-- All data is served through authenticated functions; clients cannot forge rewards, entries or votes.
alter table public.fuse_referrals enable row level security;
alter table public.fuse_referral_clicks enable row level security;
alter table public.fuse_referral_commissions enable row level security;
alter table public.fuse_contests enable row level security;
alter table public.fuse_contest_entries enable row level security;
alter table public.fuse_contest_votes enable row level security;
revoke all on public.fuse_referral_clicks, public.fuse_referrals, public.fuse_referral_commissions, public.fuse_contests, public.fuse_contest_entries, public.fuse_contest_votes from anon, authenticated;
grant all on public.fuse_referral_clicks, public.fuse_referrals, public.fuse_referral_commissions, public.fuse_contests, public.fuse_contest_entries, public.fuse_contest_votes to service_role;
grant usage, select on sequence public.fuse_contests_id_seq, public.fuse_contest_entries_id_seq to service_role;

-- Called only by a server-verified new account. Credit grant and referral attribution are atomic.
create or replace function public.claim_fuse_referral_click(p_user_id uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $
declare v_referrer uuid; v_code text; v_clicked timestamptz; v_created timestamptz;
begin
 select created_at into v_created from auth.users where id=p_user_id for update;
 select referrer_user_id,code,clicked_at into v_referrer,v_code,v_clicked
 from public.fuse_referral_clicks where token=p_token and claimed_by is null for update;
 if v_created is null or v_clicked is null or v_created<v_clicked
    or v_created>v_clicked+interval '24 hours' or now()>v_clicked+interval '48 hours'
    or v_referrer=p_user_id then return false; end if;
 insert into public.fuse_referrals(referred_user_id,referrer_user_id,code)
 values(p_user_id,v_referrer,v_code) on conflict do nothing;
 if not found then return false; end if;
 update public.fuse_referral_clicks set claimed_by=p_user_id where token=p_token;
 update public.profiles set credits=credits+1 where id=v_referrer;
 insert into public.transactions(user_id,delta,reason,meta)
 values(v_referrer,1,'fuse-referral-signup',jsonb_build_object('referred_user_id',p_user_id));
 return true;
end;$;
revoke all on function public.claim_fuse_referral_click(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_fuse_referral_click(uuid,uuid) to service_role;

-- Every verified successful credit-pack payment earns exactly one 10% commission.
-- No commission for Academy, Fuse Core, manual grants, refunded or failed payments.
create or replace function public.record_fuse_credit_commission()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
declare v_referrer uuid; v_commission integer;
begin
  if new.status <> 'success' then
    if tg_op='UPDATE' then update public.fuse_referral_commissions set status='reversed' where payment_id=new.id and status<>'paid'; end if;
    return new;
  end if;
  if new.amount_naira is null or new.amount_naira<=0
     or new.pack not in ('credits-v2-trial','credits-v2-mini','credits-v2-creator','credits-v2-studio','credits-v2-pro','credits-v2-agency','starter','mini','creator','studio','pro','power') then return new; end if;
  select referrer_user_id into v_referrer from public.fuse_referrals where referred_user_id=new.user_id;
  if v_referrer is null then return new; end if;
  v_commission=floor(new.amount_naira*0.10)::integer;
  if v_commission<=0 then return new; end if;
  insert into public.fuse_referral_commissions(payment_id,referrer_user_id,referred_user_id,amount_naira,commission_naira)
  values(new.id,v_referrer,new.user_id,new.amount_naira,v_commission)
  on conflict(payment_id) do nothing;
  return new;
end;$$;
drop trigger if exists fuse_credit_commission_on_payment on public.payments;
create trigger fuse_credit_commission_on_payment after insert or update of status on public.payments
for each row execute function public.record_fuse_credit_commission();
revoke all on function public.record_fuse_credit_commission() from public,anon,authenticated;

create or replace function public.fuse_contest_vote_counts()
returns table(entry_id bigint, vote_count bigint) language sql security definer set search_path=public,pg_temp as $$
  select v.entry_id, count(*) from public.fuse_contest_votes v group by v.entry_id
$$;
revoke all on function public.fuse_contest_vote_counts() from public,anon,authenticated;
grant execute on function public.fuse_contest_vote_counts() to service_role;

create or replace function public.finalize_fuse_contest(p_contest_id bigint)
returns bigint language plpgsql security definer set search_path=public,pg_temp as $$
declare v_contest public.fuse_contests%rowtype; v_winner bigint;
begin
  select * into v_contest from public.fuse_contests where id=p_contest_id for update;
  if not found or v_contest.status<>'open' or v_contest.voting_closes_at>now() then return null; end if;
  select e.id into v_winner from public.fuse_contest_entries e
  left join public.fuse_contest_votes v on v.entry_id=e.id
  where e.contest_id=p_contest_id and e.status='approved'
  group by e.id order by count(v.voter_user_id) desc,e.created_at asc,e.id asc limit 1;
  if v_winner is null then update public.fuse_contests set status='closed' where id=p_contest_id;
  else update public.fuse_contest_entries set status='winner' where id=v_winner;
       update public.fuse_contests set status='awarded' where id=p_contest_id; end if;
  return v_winner;
end;$$;
revoke all on function public.finalize_fuse_contest(bigint) from public,anon,authenticated;
grant execute on function public.finalize_fuse_contest(bigint) to service_role;
