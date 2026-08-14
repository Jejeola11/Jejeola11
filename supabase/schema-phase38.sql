-- ============================================================
-- Fuse Studio — Phase 38: Fuse Atelier collapses to ONE lane.
--   The Starter/Creator/Empire ladder is retired. There is now a single
--   course, "The First Client" (module_key 'atelier-lane-a'), and it opens
--   every skill.
--
--   This migration is ADDITIVE on purpose. The old rows are left in place:
--   they are the record of what each buyer actually paid for, app.js still
--   honours them (see ATELIER_KEYS), and deleting them would make the change
--   irreversible for no benefit. A buyer simply gains a lane-a row alongside
--   whatever they had.
--
--   Already applied to production 14 Aug 2026: 37 distinct buyers migrated,
--   0 missed. Re-running is safe — the NOT IN guard makes it idempotent.
-- ============================================================

insert into module_unlocks (user_id, module_key)
select distinct user_id, 'atelier-lane-a'
from module_unlocks
where module_key in ('atelier-starter','atelier-creator','atelier-empire','atelier-full')
  and user_id not in (select user_id from module_unlocks where module_key = 'atelier-lane-a');
