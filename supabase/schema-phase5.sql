-- ============================================================
-- Fuse Studio — Phase 5 features
-- Community showcase feed, marketplace buying (credits + seller payout),
-- credit bundles. Run AFTER the earlier schema files. Safe to re-run.
-- ============================================================

-- ---- Community showcase: public feed of generated images/videos ----
-- Exposes only safe columns (no prompts), so the Home feed can show what the
-- whole community is making without leaking anyone's private prompt.
create or replace view public.public_showcase as
  select id, output_url, type, model, created_at
  from public.generations
  where output_url is not null and type in ('image', 'video')
  order by created_at desc
  limit 60;
grant select on public.public_showcase to anon, authenticated;

-- ---- Marketplace: media + price ----
alter table public.marketplace_presets
  add column if not exists output_url    text,
  add column if not exists kind          text default 'image',
  add column if not exists price_credits integer not null default 10;

create table if not exists public.preset_purchases (
  id         bigint generated always as identity primary key,
  preset_id  bigint references public.marketplace_presets(id) on delete cascade,
  buyer_id   uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (preset_id, buyer_id)
);
alter table public.preset_purchases enable row level security;
drop policy if exists "own purchases read" on public.preset_purchases;
create policy "own purchases read" on public.preset_purchases for select using (auth.uid() = buyer_id);

-- Buy a preset: buyer pays price; seller earns 50%; the other 50% is removed
-- from circulation = platform profit (those credits were sold for cash).
create or replace function public.buy_preset(buyer uuid, pid bigint)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare seller uuid; price int; bal int; sellercut int; ptitle text; pprompt text; pmodel text; paspect text;
begin
  select owner_id, price_credits, title, prompt, model, aspect
    into seller, price, ptitle, pprompt, pmodel, paspect
  from public.marketplace_presets where id = pid and active = true;
  if seller is null then return jsonb_build_object('ok', false, 'error', 'Not found'); end if;

  -- already owned (or your own) -> free, just return the prompt
  if seller = buyer or exists (select 1 from public.preset_purchases where preset_id = pid and buyer_id = buyer) then
    return jsonb_build_object('ok', true, 'owned', true, 'prompt', pprompt, 'model', pmodel, 'aspect', paspect);
  end if;

  bal := public.spend_credits(buyer, price);
  if bal is null then return jsonb_build_object('ok', false, 'error', 'Not enough credits'); end if;

  sellercut := floor(price / 2.0);
  perform public.add_credits(seller, sellercut, 'preset_sale');
  update public.marketplace_presets set uses = uses + 1 where id = pid;
  insert into public.preset_purchases (preset_id, buyer_id) values (pid, buyer);

  return jsonb_build_object('ok', true, 'credits', bal, 'prompt', pprompt, 'model', pmodel, 'aspect', paspect);
end;
$$;
