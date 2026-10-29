-- Applied to production: new_user_four_welcome_credits
-- Existing accounts are not reset; the auth insert trigger grants once on profile creation.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE inserted_count integer;
BEGIN
  INSERT INTO public.profiles(id,email,credits) VALUES(new.id,new.email,4)
  ON CONFLICT(id) DO NOTHING;
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  IF inserted_count = 1 THEN
    INSERT INTO public.transactions(user_id,delta,reason,meta)
    VALUES(new.id,4,'signup_welcome_credits',jsonb_build_object('credits',4,'source','new_account'));
  END IF;
  RETURN new;
END;
$function$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC,anon,authenticated;