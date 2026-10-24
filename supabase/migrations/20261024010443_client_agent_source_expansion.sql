alter table public.client_agent_jobs add column if not exists sources_expanded boolean not null default false;
