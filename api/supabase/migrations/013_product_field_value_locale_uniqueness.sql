begin;

-- Migration 011 established separate rows per locale. Some staging databases
-- retain a legacy three-column UNIQUE constraint under a nonstandard name, so
-- discover it by its actual columns instead of guessing its name.
do $$
declare
  legacy record;
begin
  if exists (
    select 1
    from public.product_field_values
    group by company_id, product_id, field_definition_id, locale
    having count(*) > 1
  ) then
    raise exception 'product_field_values contains duplicate tenant/product/field/locale rows';
  end if;

  for legacy in
    select constraint_row.conname
    from (
      select c.conname,
             array_agg(a.attname order by a.attname)::text[] as columns
      from pg_constraint c
      join unnest(c.conkey) with ordinality as key(attnum, position) on true
      join pg_attribute a on a.attrelid=c.conrelid and a.attnum=key.attnum
      where c.conrelid='public.product_field_values'::regclass
        and c.contype='u'
      group by c.conname
    ) constraint_row
    where constraint_row.columns = array['company_id','field_definition_id','product_id']::text[]
  loop
    execute format('alter table public.product_field_values drop constraint %I', legacy.conname);
  end loop;

  for legacy in
    select index_row.index_name
    from (
      select index_class.relname as index_name,
             array_agg(attribute.attname order by attribute.attname)::text[] as columns
      from pg_index index_meta
      join pg_class index_class on index_class.oid=index_meta.indexrelid
      join unnest(index_meta.indkey::smallint[]) as key(attnum) on key.attnum > 0
      join pg_attribute attribute
        on attribute.attrelid=index_meta.indrelid and attribute.attnum=key.attnum
      where index_meta.indrelid='public.product_field_values'::regclass
        and index_meta.indisunique
        and not index_meta.indisprimary
        and not exists (select 1 from pg_constraint c where c.conindid=index_meta.indexrelid)
      group by index_class.relname, index_meta.indnkeyatts
      having index_meta.indnkeyatts=3
    ) index_row
    where index_row.columns = array['company_id','field_definition_id','product_id']::text[]
  loop
    execute format('drop index public.%I', legacy.index_name);
  end loop;
end $$;

create unique index if not exists uq_product_field_values_tenant_product_field_locale
  on public.product_field_values(company_id, product_id, field_definition_id, locale);

commit;
