-- ============================================================
-- Fuse Studio — Phase 22: tiny key/value store for server-side state that
--   isn't tied to any one user — right now just caching the Paystack
--   transfer-recipient code the auto-payout sweep creates once and reuses
--   (see netlify/functions/_payout.js). No client ever touches this table
--   directly (only service-role functions do), so RLS is enabled with no
--   policies at all -- a deliberate deny-everything-to-anon/authenticated
--   default.
-- Run after schema-phase21.sql. Safe to re-run.
-- ============================================================
create table if not exists public.platform_kv (
  key         text primary key,
  value       text,
  updated_at  timestamptz not null default now()
);

alter table public.platform_kv enable row level security;
