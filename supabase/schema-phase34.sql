-- ============================================================
-- Fuse Studio — Phase 34: Atelier landing-page lead capture.
--   Both /atelier and /atelier-b now show a name/email/WhatsApp modal
--   before every checkout tap (see paystack-init-guest.js), instead of
--   going straight to Paystack with nothing captured if someone abandons
--   checkout. This table is where that contact lands, insert-only, best-
--   effort from the server (never blocks a real payment attempt if the
--   insert fails). No RLS policies needed beyond service-role access --
--   nothing here is ever read back by the client, only by Ria via the
--   Supabase dashboard/table editor for manual follow-up.
-- Run after schema-phase33.sql. Safe to re-run.
-- ============================================================

create table if not exists public.atelier_leads (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  whatsapp   text,
  pack       text,
  created_at timestamptz not null default now()
);

alter table public.atelier_leads enable row level security;
-- No client-facing policies -- every write goes through
-- paystack-init-guest.js using the admin/service-role client, same
-- pattern as promo_codes (see schema-phase29.sql).
