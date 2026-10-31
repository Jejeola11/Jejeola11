create or replace function public.record_fuse_credit_commission()
returns trigger language plpgsql security definer
set search_path = public, pg_temp as $$
declare
  v_referrer uuid;
  v_rate numeric;
  v_commission integer;
begin
  if new.status not in ('success','manual') then
    if tg_op='UPDATE' then
      update public.fuse_referral_commissions
      set status='reversed'
      where payment_id=new.id and status<>'paid';
    end if;
    return new;
  end if;
  if new.amount_naira is null or new.amount_naira<=0 then return new; end if;
  if new.pack in ('credits-v2-trial','credits-v2-mini','credits-v2-creator','credits-v2-studio','credits-v2-pro','credits-v2-agency','starter','mini','creator','studio','pro','power') then
    v_rate:=0.05;
  elsif new.pack in ('design','video','landing','money','ebook','challenge','atelier-lane-a','academy-design','academy-video','academy-landing','academy-money','academy-ebook','academy-challenge') then
    v_rate:=0.50;
  else
    return new;
  end if;
  select referrer_user_id into v_referrer
  from public.fuse_referrals where referred_user_id=new.user_id;
  if v_referrer is null or v_referrer=new.user_id then return new; end if;
  v_commission:=floor(new.amount_naira*v_rate)::integer;
  if v_commission<=0 then return new; end if;
  insert into public.fuse_referral_commissions
    (payment_id,referrer_user_id,referred_user_id,amount_naira,commission_naira)
  values(new.id,v_referrer,new.user_id,new.amount_naira,v_commission)
  on conflict(payment_id) do nothing;
  return new;
end; $$;
