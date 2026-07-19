-- ============================================================
-- Fuse Studio — Phase 28: guest checkout (pay first, account after).
-- claimed_at tracks whether a guest-checkout payment's reference has
-- already been used to set an account password (see
-- claim-guest-account.js) -- prevents that reference being replayed to
-- silently reset the password again if it ever leaked.
-- ============================================================
alter table public.payments add column if not exists claimed_at timestamptz;
