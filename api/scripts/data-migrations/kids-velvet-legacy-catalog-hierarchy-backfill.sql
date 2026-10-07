-- Optional legacy data script (NOT an automatic platform migration).
-- Manual use only after 019_media_ownership_entity_fields.sql on the kids-velvet tenant.
--
-- Kids Velvet catalog hierarchy backfill.
--
-- Canonical source: i-play src/data/velvetCatalog.js REAL_PRODUCT_ATTRIBUTES.
-- This is a data-only, Kids Velvet-only script. It intentionally preserves
-- the earlier flat/global category rows and all legacy website_media rows.
begin;

do $$
begin
  if not exists (select 1 from public.companies where id = 'kids-velvet') then
    raise exception 'Migration 020 requires the kids-velvet tenant.';
  end if;
end $$;

-- IDs are tenant-prefixed because the normalized catalog tables retain global
-- text primary keys. ON CONFLICT uses the tenant/slug key so an existing row is
-- reused without replacing its ID or entity-owned media.
insert into public.company_brands
  (id, company_id, slug, name, sort_order, is_active, created_at, updated_at)
values
  ('kv-brand-collect', 'kids-velvet', 'collect', 'VELVET COLLECT', 10, true, now(), now()),
  ('kv-brand-plush',   'kids-velvet', 'plush',   'VELVET PLUSH',   20, true, now(), now()),
  ('kv-brand-create',  'kids-velvet', 'create',  'VELVET CREATE',  30, true, now(), now()),
  ('kv-brand-move',    'kids-velvet', 'move',    'VELVET MOVE',    40, true, now(), now()),
  ('kv-brand-build',   'kids-velvet', 'build',   'VELVET BUILD',   50, true, now(), now())
on conflict (company_id, slug) do update
set name = excluded.name,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

-- Main Categories are direct children of their canonical Brand. The existing
-- seven global categories use different slugs and remain untouched/unassigned.
insert into public.company_categories
  (id, company_id, slug, name, parent_id, brand_id, sort_order, is_active, created_at, updated_at)
select definition.id, 'kids-velvet', definition.slug, definition.name, null,
       brand.id, definition.sort_order, true, now(), now()
from (values
  ('kv-main-blind-boxes',       'blind-boxes',       '{"en":"Blind Boxes","ar":"صناديق عشوائية"}'::jsonb, 'collect', 10),
  ('kv-main-collectible-plush', 'collectible-plush', '{"en":"Collectible Plush","ar":"دمى مقتناة"}'::jsonb,       'plush',   20),
  ('kv-main-kids-cooking',      'kids-cooking',      '{"en":"Kids Cooking","ar":"طبخ الأطفال"}'::jsonb,          'create',  30),
  ('kv-main-ride-ons',          'ride-ons',          '{"en":"Ride-Ons","ar":"ألعاب الركوب"}'::jsonb,             'move',    40),
  ('kv-main-water-play',        'water-play',        '{"en":"Water Play","ar":"اللعب المائي"}'::jsonb,           'move',    50),
  ('kv-main-building-blocks',   'building-blocks',   '{"en":"Building Blocks","ar":"مكعبات البناء"}'::jsonb,     'build',   60),
  ('kv-main-clay-modeling',     'clay-and-modeling', '{"en":"Clay & Modeling","ar":"الصلصال والتشكيل"}'::jsonb, 'create',  70)
) as definition(id, slug, name, brand_slug, sort_order)
join public.company_brands brand
  on brand.company_id = 'kids-velvet' and brand.slug = definition.brand_slug
where true
on conflict (company_id, slug) do update
set name = excluded.name,
    parent_id = null,
    brand_id = excluded.brand_id,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

-- Subcategories retain the canonical parent relationship. Their brand_id is
-- also populated consistently, although hierarchy resolution uses parent_id.
insert into public.company_categories
  (id, company_id, slug, name, parent_id, brand_id, sort_order, is_active, created_at, updated_at)
select definition.id, 'kids-velvet', definition.slug, definition.name,
       main.id, main.brand_id, definition.sort_order, true, now(), now()
from (values
  ('kv-sub-mini-figures',   'mini-figures',   '{"en":"Mini Figures","ar":"مصغرة"}'::jsonb,       'blind-boxes',       10),
  ('kv-sub-mini-plush',     'mini-plush',     '{"en":"Mini Plush","ar":"مصغرة"}'::jsonb,         'collectible-plush', 20),
  ('kv-sub-baking-kits',    'baking-kits',    '{"en":"Baking Kits","ar":"خبز"}'::jsonb,          'kids-cooking',      30),
  ('kv-sub-push-cars',      'push-cars',      '{"en":"Push Cars","ar":"دفع"}'::jsonb,            'ride-ons',          40),
  ('kv-sub-mystery-boxes',  'mystery-boxes',  '{"en":"Mystery Boxes","ar":"غموض"}'::jsonb,       'blind-boxes',       50),
  ('kv-sub-water-guns',     'water-guns',     '{"en":"Water Guns","ar":"مسدسات"}'::jsonb,        'water-play',        60),
  ('kv-sub-classic-blocks', 'classic-blocks', '{"en":"Classic Blocks","ar":"كلاسيك"}'::jsonb,   'building-blocks',   70),
  ('kv-sub-play-dough',     'play-dough',     '{"en":"Play Dough","ar":"عجين"}'::jsonb,          'clay-and-modeling', 80)
) as definition(id, slug, name, main_slug, sort_order)
join public.company_categories main
  on main.company_id = 'kids-velvet'
 and main.slug = definition.main_slug
 and main.parent_id is null
where true
on conflict (company_id, slug) do update
set name = excluded.name,
    parent_id = excluded.parent_id,
    brand_id = excluded.brand_id,
    sort_order = excluded.sort_order,
    is_active = true,
    updated_at = now();

-- Reuse the eight existing products by slug. Only hierarchy/filter attributes
-- and normalized FK columns change; IDs, slugs, media, copy, pricing, inventory,
-- variants and galleries remain intact.
with product_map(slug, brand_slug, main_slug, sub_slug, manufacturer, age, gender, skill, occasion) as (values
  ('pocket-worlds-starter-set', 'collect', 'blind-boxes',       'mini-figures',   'Other', '5-6y', 'unisex', 'creativity',  'gift'),
  ('odd-pals-plush',            'plush',   'collectible-plush', 'mini-plush',     'Other', '3-4y', 'unisex', 'emotional',   'birthday'),
  ('tiny-table-bake-studio',    'create',  'kids-cooking',      'baking-kits',    'Other', '7-9y', 'girls',  'creativity',  'birthday'),
  ('neon-racers-twin-pack',     'move',    'ride-ons',          'push-cars',      'Other', '5-6y', 'boys',   'gross-motor', 'birthday'),
  ('bloom-pets-surprise-pod',   'collect', 'blind-boxes',       'mystery-boxes',  'Other', '3-4y', 'unisex', 'creativity',  'birthday'),
  ('splash-lab-water-blaster',  'move',    'water-play',        'water-guns',     'Other', '7-9y', 'unisex', 'gross-motor', 'gift'),
  ('build-club-maker-kit',      'build',   'building-blocks',   'classic-blocks', 'Other', '7-9y', 'unisex', 'stem',        'gift'),
  ('cloud-dough-color-pack',    'create',  'clay-and-modeling', 'play-dough',     'Other', '3-4y', 'unisex', 'fine-motor',  'school')
), resolved as (
  select product_map.*, brand.id as brand_id, main.id as main_id, sub.id as sub_id
  from product_map
  join public.company_brands brand
    on brand.company_id = 'kids-velvet' and brand.slug = product_map.brand_slug
  join public.company_categories main
    on main.company_id = 'kids-velvet' and main.slug = product_map.main_slug
   and main.parent_id is null and main.brand_id = brand.id
  join public.company_categories sub
    on sub.company_id = 'kids-velvet' and sub.slug = product_map.sub_slug
   and sub.parent_id = main.id
)
update public.products product
set brand_id = resolved.brand_id,
    category_id = resolved.sub_id,
    data = coalesce(product.data, '{}'::jsonb) || jsonb_build_object(
      'brandId', resolved.brand_id,
      'mainCategoryId', resolved.main_id,
      'subcategoryId', resolved.sub_id,
      'categoryId', resolved.sub_id,
      'manufacturer', resolved.manufacturer,
      'age', resolved.age,
      'gender', resolved.gender,
      'skill', resolved.skill,
      'occasion', resolved.occasion,
      'velvetPath', jsonb_build_object(
        'brandId', resolved.brand_slug,
        'categoryId', resolved.main_slug,
        'subcategoryId', resolved.sub_slug
      )
    ),
    updated_at = now()
from resolved
where product.company_id = 'kids-velvet'
  and product.slug = resolved.slug;

-- Fail atomically if staging no longer contains the exact eight canonical
-- products or if any relationship did not resolve. This also protects reruns.
do $$
declare
  resolved_count integer;
begin
  select count(*) into resolved_count
  from public.products product
  join public.company_brands brand
    on brand.company_id = product.company_id and brand.id = product.brand_id
  join public.company_categories main
    on main.company_id = product.company_id
   and main.id = product.data ->> 'mainCategoryId'
   and main.parent_id is null
   and main.brand_id = brand.id
  join public.company_categories sub
    on sub.company_id = product.company_id
   and sub.id = product.data ->> 'subcategoryId'
   and sub.parent_id = main.id
  where product.company_id = 'kids-velvet'
    and product.slug in (
      'pocket-worlds-starter-set', 'odd-pals-plush',
      'tiny-table-bake-studio', 'neon-racers-twin-pack',
      'bloom-pets-surprise-pod', 'splash-lab-water-blaster',
      'build-club-maker-kit', 'cloud-dough-color-pack'
    );

  if resolved_count <> 8 then
    raise exception 'Migration 020 expected 8 resolved Kids Velvet products, found %.', resolved_count;
  end if;
end $$;

commit;
