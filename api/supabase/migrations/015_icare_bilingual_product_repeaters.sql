begin;

update public.product_field_definitions
set field_type = 'repeatable_list',
    repeatable = true,
    translatable = true,
    options = coalesce(options, '[]'::jsonb),
    updated_at = now()
where company_id = 'icare'
  and field_key in (
    'skin_types',
    'hair_types',
    'benefits',
    'featured_ingredients',
    'complete_ingredients',
    'warnings',
    'suitable_for'
  );

commit;
