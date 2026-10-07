-- Migration 022: dedicated Mega Menu Image on company_brands.
--
-- Independent from logo_url / hero_poster / hero_video / header_image.
-- Canonical API field: menuImage (DB: menu_image).
-- Tenant-neutral schema only — no data backfill.
begin;

alter table public.company_brands
  add column if not exists menu_image text;

commit;
