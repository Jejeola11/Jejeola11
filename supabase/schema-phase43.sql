-- Fuse Atelier Phase 43: guarantee clean public Fuse Pages slugs are unique.
create unique index if not exists page_projects_slug_unique
on public.page_projects(slug)
where slug is not null;
