alter table public.client_agent_jobs add column if not exists seed_sources jsonb not null default '[]'::jsonb;
