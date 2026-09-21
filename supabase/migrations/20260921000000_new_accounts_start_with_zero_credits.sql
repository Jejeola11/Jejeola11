-- New Fuse Atelier accounts must begin with zero usable credits.
-- Applied live on 2026-09-21; this migration preserves the trigger definition.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  insert into public.profiles (id, email, credits)
    values (new.id, new.email, 0)
    on conflict (id) do nothing;
  return new;
end;
$function$;
