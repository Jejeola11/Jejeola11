-- ============================================================
-- Fuse Studio — Phase 10: prompt generation history.
-- Stores every prompt the Prompt Generator produces so users can revisit,
-- copy, and reuse them. Run after earlier files.
-- ============================================================
create table if not exists public.prompt_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  prompt     text not null,
  subject    text,
  created_at timestamptz not null default now()
);
create index if not exists prompt_history_user_idx on public.prompt_history(user_id, created_at desc);

alter table public.prompt_history enable row level security;
drop policy if exists "own prompt history read" on public.prompt_history;
create policy "own prompt history read" on public.prompt_history for select using (auth.uid() = user_id);
-- Inserts happen via the service-role key in the prompt-gen function, which
-- bypasses RLS — no insert policy needed for end users.
