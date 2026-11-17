begin;
do $test$
declare ref uuid:=gen_random_uuid(); newcomer uuid:=gen_random_uuid(); token uuid:=gen_random_uuid(); second_token uuid:=gen_random_uuid(); initial integer; after_reward integer; result boolean;
begin
 insert into auth.users(id,email,created_at) values(ref,'referral-test-'||ref||'@example.invalid',now()-interval '1 day'),(newcomer,'referral-test-'||newcomer||'@example.invalid',now());
 select credits into initial from public.profiles where id=ref;
 insert into public.fuse_referral_clicks(token,referrer_user_id,code,visitor_hash,clicked_at) values(token,ref,'test-code','rollback-test',now()-interval '1 minute');
 result:=public.claim_fuse_referral_click(newcomer,token);
 if result is not true then raise exception 'Eligible claim rejected'; end if;
 select credits into after_reward from public.profiles where id=ref;
 if after_reward-initial<>5 then raise exception 'Reward must be five'; end if;
 if (select sum(delta) from public.transactions where user_id=ref and reason='fuse-referral-signup')<>5 then raise exception 'Ledger must record five'; end if;
 if public.claim_fuse_referral_click(newcomer,token) is not false then raise exception 'Replay accepted'; end if;
 insert into public.fuse_referral_clicks(token,referrer_user_id,code,visitor_hash,clicked_at) values(second_token,ref,'test-code','rollback-test',now()-interval '1 minute');
 if public.claim_fuse_referral_click(newcomer,second_token) is not false then raise exception 'Duplicate signup accepted'; end if;
 if public.claim_fuse_referral_click(ref,second_token) is not false then raise exception 'Self referral accepted'; end if;
 if (select credits from public.profiles where id=ref)<>after_reward then raise exception 'Duplicate changed balance'; end if;
end;$test$;
rollback;
