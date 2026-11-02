create table public.academy_tutorial_views (
 tutorial_key text not null check(tutorial_key='learn-ai-from-zero'),
 viewer_hash text not null check(length(viewer_hash)=64),
 created_at timestamptz not null default now(),
 primary key(tutorial_key,viewer_hash)
);
create table public.academy_tutorial_likes (
 tutorial_key text not null check(tutorial_key='learn-ai-from-zero'),
 user_id uuid not null references auth.users(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(tutorial_key,user_id)
);
alter table public.academy_tutorial_views enable row level security;
alter table public.academy_tutorial_likes enable row level security;
revoke all on public.academy_tutorial_views,public.academy_tutorial_likes from anon,authenticated;
grant all on public.academy_tutorial_views,public.academy_tutorial_likes to service_role;