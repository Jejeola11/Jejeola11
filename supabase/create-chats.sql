create table public.create_chats (
 user_id uuid not null references auth.users(id) on delete cascade,
 id uuid not null,
 title text not null default 'New chat' check (char_length(title) between 1 and 80),
 renamed boolean not null default false,
 turns jsonb not null default '[]'::jsonb check (jsonb_typeof(turns)='array' and octet_length(turns::text)<2000000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 primary key (user_id,id)
);
alter table public.create_chats enable row level security;
revoke all on public.create_chats from anon, authenticated;
grant select, insert, update on public.create_chats to authenticated;
create policy create_chats_read on public.create_chats for select to authenticated using ((select auth.uid())=user_id);
create policy create_chats_insert on public.create_chats for insert to authenticated with check ((select auth.uid())=user_id);
create policy create_chats_update on public.create_chats for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
