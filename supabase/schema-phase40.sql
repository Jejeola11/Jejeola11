-- ============================================================
-- Fuse Atelier — Phase 40: course unlock purchases with credits
--
-- Prices:
--   Design & Flyers ............. 115 credits
--   AI UGC & Influencer ........ 115 credits
--   Landing Page Design ........  80 credits
--   Money Engine ...............  80 credits
--   Unlock all remaining ....... capped at 280 credits
--
-- The purchase is atomic: balance deduction + module unlocks + transaction
-- ledger happen in one database transaction. Only the service role can call
-- this RPC directly.
-- ============================================================

create or replace function public.purchase_course_unlock(
  p_user_id uuid,
  p_course text
)
returns table(
  status text,
  balance integer,
  credits_spent integer,
  unlocked_courses text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_balance integer;
  admin_user boolean := false;
  full_access boolean := false;
  price integer := 0;
  course_keys text[] := array[]::text[];
  purchased_courses text[] := array[]::text[];
  design_keys text[] := array['flyer-m1','flyer-m2','flyer-m3','flyer-m4','flyer-m5','flyer-m6'];
  video_keys text[] := array['aiv-m1','aiv-m2','aiv-m3','aiv-m4','aiv-m5','aiv-m6','aiv-m7','aiv-m8','aiv-m9','aiv-m10','aiv-m11','aiv-m12','aiv-m13','aiv-m14','aiv-m15','aiv-m16'];
  landing_keys text[] := array['web-m1','web-m2','web-m3-current','web-m4','web-m5','web-m6','web-m7','web-m8','web-m9','web-m10'];
  money_keys text[] := array['money'];
  design_owned boolean := false;
  video_owned boolean := false;
  landing_owned boolean := false;
  money_owned boolean := false;
  sum_individual integer := 0;
begin
  p_course := lower(trim(coalesce(p_course,'')));
  if p_course not in ('design','video','landing','money','all') then
    raise exception 'Unknown course unlock';
  end if;

  select p.credits, coalesce(p.is_admin,false)
    into current_balance, admin_user
  from public.profiles p
  where p.id = p_user_id
  for update;

  if current_balance is null then
    raise exception 'No Fuse profile for user';
  end if;

  if admin_user then
    status := 'already_owned';
    balance := current_balance;
    credits_spent := 0;
    unlocked_courses := array[]::text[];
    return next;
    return;
  end if;

  select exists(
    select 1 from public.module_unlocks u
    where u.user_id = p_user_id
      and u.module_key in ('atelier-full','atelier-empire','atelier-starter','atelier-creator')
  ) into full_access;

  if full_access then
    status := 'already_owned';
    balance := current_balance;
    credits_spent := 0;
    unlocked_courses := array[]::text[];
    return next;
    return;
  end if;

  select exists(select 1 from public.module_unlocks u where u.user_id=p_user_id and u.module_key=any(design_keys)) into design_owned;
  select exists(select 1 from public.module_unlocks u where u.user_id=p_user_id and u.module_key=any(video_keys)) into video_owned;
  select exists(select 1 from public.module_unlocks u where u.user_id=p_user_id and u.module_key=any(landing_keys)) into landing_owned;
  select exists(select 1 from public.module_unlocks u where u.user_id=p_user_id and u.module_key=any(money_keys)) into money_owned;

  if p_course = 'design' then
    if design_owned then
      status := 'already_owned'; balance := current_balance; credits_spent := 0; unlocked_courses := array[]::text[]; return next; return;
    end if;
    price := 115; course_keys := design_keys; purchased_courses := array['design'];
  elsif p_course = 'video' then
    if video_owned then
      status := 'already_owned'; balance := current_balance; credits_spent := 0; unlocked_courses := array[]::text[]; return next; return;
    end if;
    price := 115; course_keys := video_keys; purchased_courses := array['video'];
  elsif p_course = 'landing' then
    if landing_owned then
      status := 'already_owned'; balance := current_balance; credits_spent := 0; unlocked_courses := array[]::text[]; return next; return;
    end if;
    price := 80; course_keys := landing_keys; purchased_courses := array['landing'];
  elsif p_course = 'money' then
    if money_owned then
      status := 'already_owned'; balance := current_balance; credits_spent := 0; unlocked_courses := array[]::text[]; return next; return;
    end if;
    price := 80; course_keys := money_keys; purchased_courses := array['money'];
  else
    if not design_owned then
      sum_individual := sum_individual + 115;
      course_keys := course_keys || design_keys;
      purchased_courses := purchased_courses || 'design'::text;
    end if;
    if not video_owned then
      sum_individual := sum_individual + 115;
      course_keys := course_keys || video_keys;
      purchased_courses := purchased_courses || 'video'::text;
    end if;
    if not landing_owned then
      sum_individual := sum_individual + 80;
      course_keys := course_keys || landing_keys;
      purchased_courses := purchased_courses || 'landing'::text;
    end if;
    if not money_owned then
      sum_individual := sum_individual + 80;
      course_keys := course_keys || money_keys;
      purchased_courses := purchased_courses || 'money'::text;
    end if;

    if sum_individual = 0 then
      status := 'already_owned'; balance := current_balance; credits_spent := 0; unlocked_courses := array[]::text[]; return next; return;
    end if;

    price := least(280, sum_individual);
  end if;

  if current_balance < price then
    status := 'insufficient';
    balance := current_balance;
    credits_spent := price;
    unlocked_courses := purchased_courses;
    return next;
    return;
  end if;

  update public.profiles
     set credits = credits - price
   where id = p_user_id
   returning credits into current_balance;

  insert into public.module_unlocks(user_id,module_key)
  select p_user_id, k
  from unnest(course_keys) as k
  on conflict (user_id,module_key) do nothing;

  insert into public.transactions(user_id,delta,reason,meta)
  values (
    p_user_id,
    -price,
    'course_unlock',
    jsonb_build_object(
      'course_request', p_course,
      'courses', to_jsonb(purchased_courses),
      'credits', price
    )
  );

  status := 'success';
  balance := current_balance;
  credits_spent := price;
  unlocked_courses := purchased_courses;
  return next;
end;
$$;

revoke all on function public.purchase_course_unlock(uuid,text) from public;
revoke all on function public.purchase_course_unlock(uuid,text) from anon;
revoke all on function public.purchase_course_unlock(uuid,text) from authenticated;
grant execute on function public.purchase_course_unlock(uuid,text) to service_role;
