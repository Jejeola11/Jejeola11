-- Persist LinkedIn ask-first copy for Fuse Client.
alter table public.client_prospects add column if not exists pitch_linkedin text;
