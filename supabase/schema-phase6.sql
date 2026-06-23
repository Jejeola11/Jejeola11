-- ============================================================
-- Fuse Studio — Phase 6: multi-image avatars (train with up to 10 photos)
-- Run AFTER the earlier schema files. Safe to re-run.
-- ============================================================
alter table public.avatars
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

-- backfill: put any existing single image into the array
update public.avatars
   set image_urls = jsonb_build_array(image_url)
 where (image_urls = '[]'::jsonb or image_urls is null) and image_url is not null;

-- Update the launch challenge to the Instagram brief + prize.
update public.challenges
   set brief = 'Create your best AI character or ad with Fuse Studio, post it on Instagram, tag @fuse_studio2 with #FuseStudio to enter!',
       prize = '₦100,000 + 1,000 credits'
 where title = 'Fuse Launch Challenge';
