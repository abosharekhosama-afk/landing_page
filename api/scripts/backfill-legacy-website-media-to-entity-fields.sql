-- Optional data migration: copy legacy website_media slots into entity-owned fields.
--
-- Run manually after migration 019 on a tenant that still stores Brand/Category/Product
-- media in website_media. Safe to rerun: only fills NULL entity fields.
--
-- Usage (requires psql):
--   psql "$DATABASE_URL" -v company_id=kids-velvet -f api/scripts/backfill-legacy-website-media-to-entity-fields.sql
--
-- Does NOT delete website_media rows (rollback safety).
select set_config('app.target_company_id', :'company_id', true);

begin;

do $$
declare
  target_company_id text := current_setting('app.target_company_id', true);
  item record;
  brand_key text;
  brand_media text;
  cat_slug text;
  cat_media text;
  prod_slug text;
  prod_media text;
begin
  if target_company_id is null or target_company_id = '' then
    raise exception 'Pass -v company_id=<tenant-id> when running this script with psql.';
  end if;

  if not exists (select 1 from public.companies where id = target_company_id) then
    raise exception 'Company % was not found.', target_company_id;
  end if;

  for item in
    select
      section_key,
      coalesce(
        nullif(image_url, ''),
        nullif(data ->> 'imageUrl', ''),
        nullif(data ->> 'image_url', '')
      ) as image_url,
      coalesce(
        nullif(data ->> 'videoUrl', ''),
        nullif(data ->> 'video_url', '')
      ) as video_url,
      coalesce(
        nullif(data ->> 'fallbackImageUrl', ''),
        nullif(data ->> 'fallback_image_url', '')
      ) as fallback_image_url,
      is_active
    from public.website_media
    where company_id = target_company_id and section_key like 'brand.%.%'
  loop
    if coalesce(item.is_active, true) is false then continue; end if;
    brand_key := substring(item.section_key from '^brand\.([^.]+)\.');
    if brand_key is null or brand_key = '' then continue; end if;

    if item.section_key like 'brand.%.logo' or item.section_key like 'brand.%.poster' then
      brand_media := coalesce(nullif(item.image_url, ''), nullif(item.fallback_image_url, ''));
    else
      brand_media := coalesce(nullif(item.video_url, ''), nullif(item.image_url, ''));
    end if;
    if brand_media is null then continue; end if;

    if item.section_key like 'brand.%.logo' then
      update public.company_brands
         set logo_url = coalesce(logo_url, brand_media), updated_at = now()
       where company_id = target_company_id and slug = brand_key and logo_url is null;
    elsif item.section_key like 'brand.%.video' then
      update public.company_brands
         set hero_video = coalesce(hero_video, brand_media), updated_at = now()
       where company_id = target_company_id and slug = brand_key and hero_video is null;
    elsif item.section_key like 'brand.%.poster' then
      update public.company_brands
         set hero_poster = coalesce(hero_poster, brand_media), updated_at = now()
       where company_id = target_company_id and slug = brand_key and hero_poster is null;
    end if;
  end loop;

  for item in
    select
      section_key,
      coalesce(
        nullif(image_url, ''),
        nullif(data ->> 'imageUrl', ''),
        nullif(data ->> 'image_url', '')
      ) as image_url,
      coalesce(
        nullif(data ->> 'videoUrl', ''),
        nullif(data ->> 'video_url', '')
      ) as video_url,
      is_active
    from public.website_media
    where company_id = target_company_id and section_key like 'category.%.heroVideo'
  loop
    if coalesce(item.is_active, true) is false then continue; end if;
    cat_slug := substring(item.section_key from '^category\.([^.]+)\.');
    if cat_slug is null or cat_slug = '' then continue; end if;
    cat_media := coalesce(nullif(item.video_url, ''), nullif(item.image_url, ''));
    if cat_media is null then continue; end if;

    update public.company_categories
       set hero_video = coalesce(hero_video, cat_media), updated_at = now()
     where company_id = target_company_id and slug = cat_slug and parent_id is null and hero_video is null;
  end loop;

  for item in
    select
      section_key,
      coalesce(
        nullif(image_url, ''),
        nullif(data ->> 'imageUrl', ''),
        nullif(data ->> 'image_url', '')
      ) as image_url,
      coalesce(
        nullif(data ->> 'videoUrl', ''),
        nullif(data ->> 'video_url', '')
      ) as video_url,
      coalesce(
        nullif(data ->> 'fallbackImageUrl', ''),
        nullif(data ->> 'fallback_image_url', '')
      ) as fallback_image_url,
      is_active
    from public.website_media
    where company_id = target_company_id
      and (section_key like 'product.%.usageVideo' or section_key like 'product.%.usageVideoPoster')
  loop
    if coalesce(item.is_active, true) is false then continue; end if;
    prod_slug := substring(item.section_key from '^product\.([^.]+)\.');
    if prod_slug is null or prod_slug = '' then continue; end if;

    if item.section_key like 'product.%.usageVideo' then
      prod_media := coalesce(nullif(item.video_url, ''), nullif(item.image_url, ''));
      if prod_media is not null then
        update public.products
           set usage_video = coalesce(usage_video, prod_media), updated_at = now()
         where company_id = target_company_id and slug = prod_slug and usage_video is null;
      end if;
    else
      prod_media := coalesce(nullif(item.image_url, ''), nullif(item.fallback_image_url, ''));
      if prod_media is not null then
        update public.products
           set usage_video_poster = coalesce(usage_video_poster, prod_media), updated_at = now()
         where company_id = target_company_id and slug = prod_slug and usage_video_poster is null;
      end if;
    end if;
  end loop;
end $$;

commit;
