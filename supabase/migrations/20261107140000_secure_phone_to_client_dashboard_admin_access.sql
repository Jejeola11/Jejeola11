-- Enforce cryptographically verified Supabase identity and platform admin membership.
-- The p_email argument is retained for backwards-compatible callers, but is NOT trusted.
CREATE OR REPLACE FUNCTION public.get_phone_to_client_dashboard(p_email text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_leads jsonb;
  v_total int;
  v_today int;
  v_countries int;
begin
  if not (
    (auth.jwt() ->> 'role') = 'service_role'
    or (
      auth.uid() is not null
      and exists (
        select 1 from public.profiles
        where id = auth.uid() and is_admin is true
      )
    )
  ) then
    raise exception 'access_denied' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'first_name', first_name,
        'email', email,
        'whatsapp', whatsapp,
        'country', country,
        'biggest_struggle', biggest_struggle,
        'source', source,
        'utm_campaign', utm_campaign,
        'created_at', created_at
      )
      order by created_at desc
    ),
    '[]'::jsonb
  )
  into v_leads
  from (
    select *
    from public.phone_to_client_leads
    order by created_at desc
    limit 1000
  ) x;

  select count(*) into v_total from public.phone_to_client_leads;
  select count(*) into v_today
    from public.phone_to_client_leads
    where created_at::date = current_date;
  select count(distinct country) into v_countries
    from public.phone_to_client_leads
    where nullif(trim(country),'') is not null;

  return jsonb_build_object(
    'leads', v_leads,
    'stats', jsonb_build_object(
      'total', v_total,
      'today', v_today,
      'countries', v_countries
    )
  );
end;
$function$
;
REVOKE EXECUTE ON FUNCTION public.get_phone_to_client_dashboard(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_phone_to_client_dashboard(text) TO authenticated, service_role;
