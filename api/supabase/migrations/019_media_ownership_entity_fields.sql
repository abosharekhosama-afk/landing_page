-- Migration 019: entity-owned media fields + direct category->brand ownership.
--
-- Media ownership rule:
--   Brand    -> logo_url, hero_video, hero_poster
--   Category -> brand_id, image_url, hero_video
--   Product  -> usage_video, usage_video_poster
--   Website Media -> global/page storefront media only.
--
-- Legacy website_media keys (brand.*, category.*.heroVideo, product.*.usageVideo)
-- are not backfilled here. Use the optional tenant data script when needed:
--   api/scripts/backfill-legacy-website-media-to-entity-fields.sql
--
-- This migration is tenant-neutral: schema only, no data backfill.
begin;

alter table public.company_brands add column if not exists hero_video text;
alter table public.company_brands add column if not exists hero_poster text;

alter table public.company_categories add column if not exists brand_id text;
alter table public.company_categories add column if not exists hero_video text;

alter table public.products add column if not exists usage_video text;
alter table public.products add column if not exists usage_video_poster text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'fk_company_categories_brand') then
    alter table public.company_categories
      add constraint fk_company_categories_brand
      foreign key (company_id, brand_id)
      references public.company_brands(company_id, id)
      on delete restrict not valid;
  end if;
end $$;

create index if not exists idx_company_categories_brand
  on public.company_categories(company_id, brand_id)
  where brand_id is not null;

commit;
