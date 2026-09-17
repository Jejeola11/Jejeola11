-- Expand Fuse Client prospect stages used by the acquisition OS.
alter table public.client_prospects
  drop constraint if exists client_prospects_status_check;

alter table public.client_prospects
  add constraint client_prospects_status_check
  check (
    status = any (
      array[
        'new'::text,
        'qualified'::text,
        'sample_ready'::text,
        'pitched'::text,
        'follow_up'::text,
        'won'::text,
        'lost'::text,
        'research_ready'::text,
        'replied'::text,
        'brief_ready'::text,
        'sample_sent'::text,
        'proposal_sent'::text,
        'deposit_paid'::text,
        'in_delivery'::text,
        'delivered'::text,
        'contacted'::text,
        'loom_sent'::text
      ]
    )
  );
