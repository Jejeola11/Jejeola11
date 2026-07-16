-- ============================================================
-- Fuse Studio — Phase 15: Flyer Studio (conversational AI flyer designer).
--   A flyer_projects row tracks one iterative design session: the brief,
--   the current working hero visual (pre-text), a log of AI-edit layers
--   applied on top of it, the chosen typography ("text_spec"), and the
--   final composited output. jobs.project_id links async generation jobs
--   (hero visual, layer edits) back to their project so job-status.js can
--   update the right row when a job completes.
-- Run after earlier files. Safe to re-run.
-- ============================================================

alter table public.jobs add column if not exists project_id uuid;

create table if not exists public.flyer_projects (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  brief        text not null,                          -- the user's original design request
  niche        text,                                    -- inferred/stated niche (e.g. "web3", "fitness")
  hero_prompt  text,                                     -- current image-gen prompt for the hero/background visual
  hero_image_url text,                                   -- current working visual (pre-final-text), replaced as layers are added
  layers       jsonb not null default '[]'::jsonb,        -- [{instruction, image_url, created_at}] — history of applied AI-edit layers
  text_spec    jsonb not null default '{}'::jsonb,         -- {headline, subhead, bullets[], badge, footer, accent_color, accent_word}
  final_url    text,                                      -- final composited flyer (text baked in via _canvas.js)
  credits      integer not null default 0,                -- cumulative credits spent on this project
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists flyer_projects_user_idx on public.flyer_projects (user_id, created_at desc);

alter table public.flyer_projects enable row level security;
drop policy if exists "own flyer projects read" on public.flyer_projects;
create policy "own flyer projects read" on public.flyer_projects for select using (auth.uid() = user_id);
