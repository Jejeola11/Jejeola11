-- Recover public launch-day accounts in the existing audience dashboard.
-- Existing subscribers, opt-outs and suppression records remain unchanged.
insert into public.audience_contacts(email_normalized,first_name,email_marketing_status)
select lower(btrim(u.email)),left(coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'),''),nullif(btrim(u.raw_user_meta_data->>'name'),''),split_part(u.email,'@',1)),80),'unknown'
from public.profiles p join auth.users u on u.id=p.id
where p.created_at >= '2026-10-27T23:00:00Z'::timestamptz and u.email is not null
on conflict(email_normalized) do nothing;
insert into public.audience_contact_sources(contact_id,source,source_record_id)
select a.id,'fuse_platform_signup',p.id from public.profiles p
join auth.users u on u.id=p.id join public.audience_contacts a on a.email_normalized=lower(btrim(u.email))
where p.created_at >= '2026-10-27T23:00:00Z'::timestamptz
on conflict(contact_id,source,source_record_id) do nothing;
