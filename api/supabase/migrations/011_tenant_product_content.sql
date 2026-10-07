begin;

alter table public.product_field_definitions
  add column if not exists section text not null default 'details',
  add column if not exists help_text jsonb not null default '{}'::jsonb,
  add column if not exists default_value jsonb not null default 'null'::jsonb,
  add column if not exists accepted_media_types jsonb not null default '[]'::jsonb,
  add column if not exists maximum_file_size integer,
  add column if not exists repeatable boolean not null default false,
  add column if not exists translatable boolean not null default false,
  add column if not exists storefront_mapping_key text;

alter table public.product_field_values
  add column if not exists locale text not null default 'neutral';

alter table public.product_field_values
  drop constraint if exists product_field_values_company_id_product_id_field_definition_id_key;

create unique index if not exists uq_product_field_values_tenant_product_field_locale
  on public.product_field_values(company_id, product_id, field_definition_id, locale);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'product_field_values_tenant_product_fk'
  ) then
    alter table public.product_field_values
      add constraint product_field_values_tenant_product_fk
      foreign key(company_id, product_id)
      references public.products(company_id, id)
      on delete cascade not valid;
  end if;
end $$;

insert into public.product_field_definitions
  (id,company_id,field_key,label,field_type,validation,options,sort_order,is_required,is_active,section,help_text,default_value,accepted_media_types,maximum_file_size,repeatable,translatable,storefront_mapping_key)
values
  ('icare-field-product-type','icare','product_type','{"en":"Product type","ar":"نوع المنتج"}','text','{}','[]',10,false,true,'details','{}','null','[]',null,false,true,'productType'),
  ('icare-field-how-to-use','icare','how_to_use','{"en":"How to use","ar":"طريقة الاستخدام"}','rich_text','{}','[]',20,false,true,'details','{}','null','[]',null,false,true,'howToUse'),
  ('icare-field-benefits','icare','benefits','{"en":"Key benefits","ar":"الفوائد الرئيسية"}','repeatable_list','{}','[]',30,false,true,'details','{}','[]','[]',null,true,true,'benefits'),
  ('icare-field-featured-ingredients','icare','featured_ingredients','{"en":"Featured ingredients","ar":"المكونات البارزة"}','repeatable_list','{}','[]',40,false,true,'details','{}','[]','[]',null,true,true,'featuredIngredients'),
  ('icare-field-complete-ingredients','icare','complete_ingredients','{"en":"Complete ingredients","ar":"قائمة المكونات الكاملة"}','rich_text','{}','[]',50,false,true,'details','{}','null','[]',null,false,true,'ingredients'),
  ('icare-field-skin-types','icare','skin_types','{"en":"Suitable skin types","ar":"أنواع البشرة المناسبة"}','multi_select','{}','[{"value":"normal"},{"value":"dry"},{"value":"oily"},{"value":"combination"},{"value":"sensitive"}]',60,false,true,'details','{}','[]','[]',null,true,false,'skinTypes'),
  ('icare-field-hair-types','icare','hair_types','{"en":"Suitable hair types","ar":"أنواع الشعر المناسبة"}','repeatable_list','{}','[]',70,false,true,'details','{}','[]','[]',null,true,true,'hairTypes'),
  ('icare-field-warnings','icare','warnings','{"en":"Warnings and usage notes","ar":"التحذيرات وملاحظات الاستخدام"}','rich_text','{}','[]',80,false,true,'details','{}','null','[]',null,false,true,'warnings'),
  ('icare-field-suitable-for','icare','suitable_for','{"en":"Suitable for","ar":"مناسب لـ"}','repeatable_list','{}','[]',90,false,true,'details','{}','[]','[]',null,true,true,'suitableFor'),
  ('icare-field-finish','icare','finish','{"en":"Finish","ar":"اللمسة النهائية"}','text','{}','[]',100,false,true,'details','{}','null','[]',null,false,true,'finish'),
  ('icare-field-coverage','icare','coverage','{"en":"Coverage","ar":"التغطية"}','text','{}','[]',110,false,true,'details','{}','null','[]',null,false,true,'coverage'),
  ('icare-field-texture','icare','texture','{"en":"Texture","ar":"القوام"}','text','{}','[]',120,false,true,'details','{}','null','[]',null,false,true,'texture'),
  ('icare-field-origin','icare','country_of_origin','{"en":"Country of origin","ar":"بلد المنشأ"}','text','{}','[]',130,false,true,'details','{}','null','[]',null,false,true,'countryOfOrigin'),
  ('icare-field-gallery','icare','gallery_images','{"en":"Gallery images","ar":"صور المعرض"}','multiple_images','{"maxItems":20}','[]',10,false,true,'media','{}','[]','["image/jpeg","image/png","image/webp"]',8388608,true,false,'images'),
  ('icare-field-video','icare','product_video','{"en":"Product video","ar":"فيديو المنتج"}','video','{}','[]',20,false,true,'media','{}','null','["video/mp4","video/webm"]',52428800,false,false,'videoUrl'),
  ('icare-field-highlights','icare','product_highlights','{"en":"Product highlights","ar":"أبرز مميزات المنتج"}','repeatable_list','{}','[]',10,false,true,'showcase','{}','[]','[]',null,true,true,'highlights'),
  ('icare-field-faqs','icare','product_faqs','{"en":"Product FAQs","ar":"الأسئلة الشائعة للمنتج"}','key_value','{}','[]',20,false,true,'showcase','{}','[]','[]',null,true,false,'faqs'),
  ('icare-field-showcase','icare','showcase_units','{"en":"Product detail sections","ar":"أقسام تفاصيل المنتج"}','repeatable_list','{}','[]',30,false,true,'showcase','{}','[]','[]',null,true,false,'showcaseUnits'),
  ('icare-field-marketing-caption','icare','marketing_caption','{"en":"Marketing caption","ar":"النص التسويقي"}','rich_text','{}','[]',10,false,true,'marketing','{}','null','[]',null,false,true,'marketingCaption'),
  ('icare-field-social-description','icare','social_description','{"en":"Social short description","ar":"الوصف القصير للتواصل الاجتماعي"}','textarea','{}','[]',20,false,true,'marketing','{}','null','[]',null,false,true,'socialDescription'),
  ('icare-field-hashtags','icare','hashtags','{"en":"Hashtags","ar":"الوسوم"}','repeatable_list','{}','[]',30,false,true,'marketing','{}','[]','[]',null,true,false,'hashtags'),
  ('icare-field-meta-title','icare','meta_title','{"en":"Meta title","ar":"عنوان محركات البحث"}','text','{"maxLength":70}','[]',10,false,true,'seo','{}','null','[]',null,false,true,'metaTitle'),
  ('icare-field-meta-description','icare','meta_description','{"en":"Meta description","ar":"وصف محركات البحث"}','textarea','{"maxLength":170}','[]',20,false,true,'seo','{}','null','[]',null,false,true,'metaDescription'),
  ('icare-field-canonical-url','icare','canonical_url','{"en":"Canonical URL","ar":"الرابط الأساسي"}','url','{}','[]',30,false,true,'seo','{}','null','[]',null,false,false,'canonicalUrl')
on conflict(company_id,field_key) do update set
  label=excluded.label,field_type=excluded.field_type,validation=excluded.validation,
  options=excluded.options,sort_order=excluded.sort_order,is_required=excluded.is_required,
  section=excluded.section,help_text=excluded.help_text,default_value=excluded.default_value,
  accepted_media_types=excluded.accepted_media_types,maximum_file_size=excluded.maximum_file_size,
  repeatable=excluded.repeatable,translatable=excluded.translatable,
  storefront_mapping_key=excluded.storefront_mapping_key,updated_at=now();

commit;
