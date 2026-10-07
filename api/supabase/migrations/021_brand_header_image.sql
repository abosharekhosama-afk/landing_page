-- Migration 021: dedicated Brand Page Header Image on company_brands.
--
-- Independent from logo_url / hero_poster / hero_video.
-- Canonical API field: headerImage (DB: header_image).
-- Tenant-neutral schema only — no data backfill.
begin;

alter table public.company_brands
  add column if not exists header_image text;

commit;
