-- ============================================================
-- Fuse Studio — Phase 35: existing-balance conversion for the 10 Aug 2026
--   credit reprice (see netlify/functions/_packs.js — CREDIT_USD 0.016 ->
--   0.11, every model's credit-cost compressed way down, e.g. nano-banana
--   6cr -> 2cr). Every PACKS entry, REFERRAL reward and generation cost was
--   rescaled by the same blended factor (~6x) so pack $/credit stays above
--   the new CREDIT_USD floor. Existing users are still sitting on balances
--   priced in the OLD, larger units -- this converts every balance to the
--   new units by the same factor, so nobody's real spending power jumps or
--   drops relative to everyone else.
--
-- Credits are one fungible pool (no trial-vs-paid split exists -- see
-- _supabase.js's getPlan/hasPurchased comment), so a single uniform divisor
-- is applied to every balance regardless of how it was earned. floor(), not
-- round(), so nobody ends up with slightly more buying power than the
-- naira/¢ they actually paid covers.
--
-- RUN THE PREVIEW BLOCK FIRST. Nothing is written until you run the second
-- block. Safe to re-run the preview; the UPDATE block is NOT idempotent --
-- running it twice halves balances twice -- so run it exactly once.
-- ============================================================

-- ---- 1) PREVIEW ONLY -- confirm this looks right before touching anything ----
select
  id as user_id,
  email,
  credits as old_credits,
  floor(credits / 6.0)::int as new_credits,
  credits - floor(credits / 6.0)::int as credits_removed
from profiles
where credits > 0
order by credits desc;

-- ---- 2) APPLY -- uncomment and run once you've reviewed the preview above ----
-- begin;
--
-- create temporary table credit_reprice_20260810 as
-- select id as user_id, credits as old_credits, floor(credits / 6.0)::int as new_credits
-- from profiles
-- where credits > 0;
--
-- update profiles p
-- set credits = s.new_credits
-- from credit_reprice_20260810 s
-- where p.id = s.user_id;
--
-- insert into transactions (user_id, delta, reason)
-- select user_id, new_credits - old_credits, 'reprice_2026_08_10'
-- from credit_reprice_20260810
-- where new_credits <> old_credits;
--
-- -- sanity check before committing:
-- select count(*) as users_touched, sum(old_credits - new_credits) as total_credits_removed
-- from credit_reprice_20260810;
--
-- commit;
