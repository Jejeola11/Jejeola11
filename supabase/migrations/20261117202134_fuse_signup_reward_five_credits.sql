-- New eligible referral signups earn five credits. Existing awards remain unchanged.
create or replace function public.claim_fuse_referral_click(p_user_id uuid,p_token uuid)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
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
 update public.profiles set credits=credits+5 where id=v_referrer;
 insert into public.transactions(user_id,delta,reason,meta)
 values(v_referrer,5,'fuse-referral-signup',jsonb_build_object('referred_user_id',p_user_id));
 return true;
end;$$;
revoke all on function public.claim_fuse_referral_click(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_fuse_referral_click(uuid,uuid) to service_role;

