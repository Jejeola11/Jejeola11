create index if not exists audience_campaigns_due_email_idx
  on public.audience_campaigns(scheduled_for)
  where channel = 'email' and status = 'scheduled';
