-- Track the three ask-first follow-ups in the existing prospect workflow.
alter table public.client_prospects
  add column if not exists follow_up_count integer not null default 0;

create index if not exists client_prospects_user_follow_up_due_idx
  on public.client_prospects (user_id, next_follow_up)
  where next_follow_up is not null;
