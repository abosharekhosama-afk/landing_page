-- Migration 009: normalized tenant-scoped catalog categories and brands.
-- No data is backfilled, rewritten, or deleted. API queries must always filter
-- catalog rows using the authenticated membership company_id.
begin;

do $migration$
begin
  if to_regclass('public.company_categories') is null then
    execute $ddl$
      create table public.company_categories (
        id text primary key,
        company_id text not null references public.companies(id) on delete restrict,
        slug text not null,
        name jsonb not null,
        description jsonb,
        parent_id text,
        image_url text,
        sort_order integer not null default 0,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (company_id, slug),
        unique (company_id, id),
        check (jsonb_typeof(name) = 'object'),
        check (description is null or jsonb_typeof(description) = 'object'),
        constraint fk_company_categories_parent
          foreign key (company_id, parent_id)
          references public.company_categories(company_id, id)
          on delete restrict
      )
    $ddl$;
  end if;

  if to_regclass('public.company_brands') is null then
    execute $ddl$
      create table public.company_brands (
        id text primary key,
        company_id text not null references public.companies(id) on delete restrict,
        slug text not null,
        name text not null,
        logo_url text,
        country text,
        sort_order integer not null default 0,
        is_active boolean not null default true,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        unique (company_id, slug),
        unique (company_id, id)
      )
    $ddl$;
  end if;
end
$migration$;

-- Fail fast if a prior partial deployment created incompatible columns.
do $migration$
declare
  expected record;
  relation_id oid;
  actual_type oid;
  actual_not_null boolean;
  actual_default text;
begin
  for expected in
    select * from (values
      ('company_categories','id','text',true,'none'),
      ('company_categories','company_id','text',true,'none'),
      ('company_categories','slug','text',true,'none'),
      ('company_categories','name','jsonb',true,'none'),
      ('company_categories','description','jsonb',false,'none'),
      ('company_categories','parent_id','text',false,'none'),
      ('company_categories','image_url','text',false,'none'),
      ('company_categories','sort_order','integer',true,'zero'),
      ('company_categories','is_active','boolean',true,'true'),
      ('company_categories','created_at','timestamp with time zone',true,'now'),
      ('company_categories','updated_at','timestamp with time zone',true,'now'),
      ('company_brands','id','text',true,'none'),
      ('company_brands','company_id','text',true,'none'),
      ('company_brands','slug','text',true,'none'),
      ('company_brands','name','text',true,'none'),
      ('company_brands','logo_url','text',false,'none'),
      ('company_brands','country','text',false,'none'),
      ('company_brands','sort_order','integer',true,'zero'),
      ('company_brands','is_active','boolean',true,'true'),
      ('company_brands','created_at','timestamp with time zone',true,'now'),
      ('company_brands','updated_at','timestamp with time zone',true,'now')
    ) as required(table_name, column_name, type_name, not_null, default_kind)
  loop
    relation_id := to_regclass(format('public.%I', expected.table_name));
    select a.atttypid, a.attnotnull, pg_get_expr(d.adbin, d.adrelid)
      into actual_type, actual_not_null, actual_default
      from pg_attribute a
      left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
      where a.attrelid = relation_id and a.attname = expected.column_name
        and a.attnum > 0 and not a.attisdropped;
    if not found then
      raise exception 'Migration 009 incompatible schema: %.% is missing.', expected.table_name, expected.column_name;
    end if;
    if actual_type <> expected.type_name::regtype::oid or actual_not_null <> expected.not_null then
      raise exception 'Migration 009 incompatible schema: %.% type or nullability differs.', expected.table_name, expected.column_name;
    end if;
    if expected.default_kind = 'none' and actual_default is not null then
      raise exception 'Migration 009 incompatible schema: %.% has an unexpected default.', expected.table_name, expected.column_name;
    elsif expected.default_kind = 'zero' and coalesce(actual_default, '') !~ '^0(::integer)?$' then
      raise exception 'Migration 009 incompatible schema: %.% must default to zero.', expected.table_name, expected.column_name;
    elsif expected.default_kind = 'true' and coalesce(actual_default, '') !~ '^true$' then
      raise exception 'Migration 009 incompatible schema: %.% must default to true.', expected.table_name, expected.column_name;
    elsif expected.default_kind = 'now' and coalesce(actual_default, '') <> 'now()' then
      raise exception 'Migration 009 incompatible schema: %.% must default to now().', expected.table_name, expected.column_name;
    end if;
  end loop;

  -- Expected names and definitions are mandatory so an incompatible same-named
  -- constraint cannot be masked by a differently named compatible constraint.
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass
      and c.conname='company_categories_pkey' and c.contype='p'
      and not c.condeferrable and not c.condeferred
      and c.conkey=array[(select attnum from pg_attribute where attrelid=c.conrelid and attname='id')]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: company_categories_pkey is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_brands'::regclass
      and c.conname='company_brands_pkey' and c.contype='p'
      and not c.condeferrable and not c.condeferred
      and c.conkey=array[(select attnum from pg_attribute where attrelid=c.conrelid and attname='id')]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: company_brands_pkey is missing or incompatible.'; end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass
      and c.conname='company_categories_name_check' and c.contype='c'
      and c.convalidated and not c.connoinherit
      and lower(regexp_replace(pg_get_expr(c.conbin,c.conrelid),'[[:space:]()]','','g'))
        = 'jsonb_typeofname=''object''::text'
  ) then raise exception 'Migration 009 incompatible schema: category name JSONB check is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass
      and c.conname='company_categories_description_check' and c.contype='c'
      and c.convalidated and not c.connoinherit
      and lower(regexp_replace(pg_get_expr(c.conbin,c.conrelid),'[[:space:]()]','','g'))
        = 'descriptionisnullorjsonb_typeofdescription=''object''::text'
  ) then raise exception 'Migration 009 incompatible schema: category description JSONB check is missing or incompatible.'; end if;

  if not exists (
    select 1 from pg_constraint c where c.conrelid='public.company_categories'::regclass
      and c.conname='company_categories_company_id_slug_key' and c.contype='u'
      and not c.condeferrable and not c.condeferred
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='slug')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: named category company/slug unique constraint is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c where c.conrelid='public.company_categories'::regclass
      and c.conname='company_categories_company_id_id_key' and c.contype='u'
      and not c.condeferrable and not c.condeferred
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='id')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: named category company/id unique constraint is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c where c.conrelid='public.company_brands'::regclass
      and c.conname='company_brands_company_id_slug_key' and c.contype='u'
      and not c.condeferrable and not c.condeferred
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='slug')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: named brand company/slug unique constraint is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c where c.conrelid='public.company_brands'::regclass
      and c.conname='company_brands_company_id_id_key' and c.contype='u'
      and not c.condeferrable and not c.condeferred
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='id')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: named brand company/id unique constraint is missing or incompatible.'; end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass
      and c.conname='company_categories_company_id_fkey' and c.contype='f'
      and not c.condeferrable and not c.condeferred and c.confdeltype='r'
      and c.confrelid='public.companies'::regclass
      and c.conkey=array[(select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id')]::smallint[]
      and c.confkey=array[(select attnum from pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: named category company foreign key is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_brands'::regclass
      and c.conname='company_brands_company_id_fkey' and c.contype='f'
      and not c.condeferrable and not c.condeferred and c.confdeltype='r'
      and c.confrelid='public.companies'::regclass
      and c.conkey=array[(select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id')]::smallint[]
      and c.confkey=array[(select attnum from pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: named brand company foreign key is missing or incompatible.'; end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass
      and c.conname='fk_company_categories_parent' and c.contype='f'
      and not c.condeferrable and not c.condeferred and c.confdeltype='r'
      and c.confrelid='public.company_categories'::regclass
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='parent_id')
      ]::smallint[]
      and c.confkey=array[
        (select attnum from pg_attribute where attrelid=c.confrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.confrelid and attname='id')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: fk_company_categories_parent is missing or incompatible.'; end if;

  if not exists (
    select 1 from pg_constraint c where c.conrelid = 'public.company_categories'::regclass
      and c.contype = 'u'
      and c.conkey = array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='slug')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: category company/slug uniqueness is missing.'; end if;
  if not exists (
    select 1 from pg_constraint c where c.conrelid = 'public.company_categories'::regclass
      and c.contype = 'u'
      and c.conkey = array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='id')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: category company/id uniqueness is missing.'; end if;
  if not exists (
    select 1 from pg_constraint c where c.conrelid = 'public.company_brands'::regclass
      and c.contype = 'u'
      and c.conkey = array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='slug')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: brand company/slug uniqueness is missing.'; end if;
  if not exists (
    select 1 from pg_constraint c where c.conrelid = 'public.company_brands'::regclass
      and c.contype = 'u'
      and c.conkey = array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='id')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: brand company/id uniqueness is missing.'; end if;

  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass and c.contype='f'
      and c.confrelid='public.companies'::regclass and c.confdeltype='r'
      and c.conkey=array[(select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id')]::smallint[]
      and c.confkey=array[(select attnum from pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: category company foreign key is missing.'; end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_brands'::regclass and c.contype='f'
      and c.confrelid='public.companies'::regclass and c.confdeltype='r'
      and c.conkey=array[(select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id')]::smallint[]
      and c.confkey=array[(select attnum from pg_attribute where attrelid=c.confrelid and attname='id')]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: brand company foreign key is missing.'; end if;
  if not exists (
    select 1 from pg_constraint c
    where c.conrelid='public.company_categories'::regclass and c.contype='f'
      and c.confrelid='public.company_categories'::regclass and c.confdeltype='r'
      and c.conkey=array[
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.conrelid and attname='parent_id')
      ]::smallint[]
      and c.confkey=array[
        (select attnum from pg_attribute where attrelid=c.confrelid and attname='company_id'),
        (select attnum from pg_attribute where attrelid=c.confrelid and attname='id')
      ]::smallint[]
  ) then raise exception 'Migration 009 incompatible schema: category parent foreign key is missing or incompatible.'; end if;
end
$migration$;

do $migration$
declare
  column_name text;
  attribute_type oid;
  attribute_not_null boolean;
begin
  foreach column_name in array array['category_id','brand_id'] loop
    select a.atttypid, a.attnotnull into attribute_type, attribute_not_null
      from pg_attribute a
      where a.attrelid='public.products'::regclass and a.attname=column_name
        and a.attnum > 0 and not a.attisdropped;
    if not found then
      execute format('alter table public.products add column %I text', column_name);
    elsif attribute_type <> 'text'::regtype::oid or attribute_not_null then
      raise exception 'Migration 009 incompatible schema: products.% must be nullable text.', column_name;
    end if;
  end loop;
end
$migration$;

-- NOT VALID enforces future writes without scanning all existing products now.
-- Validation is deliberately deferred to a separately approved operation.
do $migration$
declare
  item record;
  named_constraint record;
  named_exists boolean;
  compatible_exists boolean;
begin
  for item in select * from (values
    ('fk_products_company_category','category_id','company_categories'),
    ('fk_products_company_brand','brand_id','company_brands')
  ) as definitions(constraint_name, local_column, referenced_table)
  loop
    select c.* into named_constraint from pg_constraint c
      where c.conrelid='public.products'::regclass and c.conname=item.constraint_name;
    named_exists := found;
    select exists(
      select 1 from pg_constraint c
      where c.conrelid='public.products'::regclass and c.contype='f' and c.confdeltype='r'
        and not c.condeferrable and not c.condeferred
        and (not named_exists or c.conname=item.constraint_name)
        and c.confrelid=to_regclass(format('public.%I',item.referenced_table))
        and c.conkey=array[
          (select attnum from pg_attribute where attrelid=c.conrelid and attname='company_id'),
          (select attnum from pg_attribute where attrelid=c.conrelid and attname=item.local_column)
        ]::smallint[]
        and c.confkey=array[
          (select attnum from pg_attribute where attrelid=c.confrelid and attname='company_id'),
          (select attnum from pg_attribute where attrelid=c.confrelid and attname='id')
        ]::smallint[]
    ) into compatible_exists;

    if named_exists and not compatible_exists then
      raise exception 'Migration 009 incompatible schema: constraint % has a different definition.', item.constraint_name;
    elsif not named_exists and compatible_exists then
      raise exception 'Migration 009 incompatible schema: equivalent product foreign key exists under another name for %.', item.local_column;
    elsif not named_exists then
      execute format(
        'alter table public.products add constraint %I foreign key (company_id, %I) references public.%I(company_id, id) on delete restrict not valid',
        item.constraint_name, item.local_column, item.referenced_table
      );
    end if;
  end loop;
end
$migration$;

-- Validate same-named indexes structurally instead of silently accepting them.
do $migration$
declare
  item record;
  index_id regclass;
  actual_columns text[];
  valid_definition boolean;
begin
  for item in select * from (values
    ('idx_company_categories_active_sort','company_categories',array['company_id','is_active','sort_order']),
    ('idx_company_brands_active_sort','company_brands',array['company_id','is_active','sort_order']),
    ('idx_products_company_category','products',array['company_id','category_id']),
    ('idx_products_company_brand','products',array['company_id','brand_id'])
  ) as definitions(index_name, table_name, columns)
  loop
    index_id := to_regclass(format('public.%I', item.index_name));
    if index_id is null then
      execute format('create index %I on public.%I (%s)', item.index_name, item.table_name,
        (select string_agg(format('%I', values.column_name), ', ' order by values.position)
           from unnest(item.columns) with ordinality as values(column_name, position)));
    else
      select array_agg(a.attname order by keys.ordinality),
             i.indrelid=to_regclass(format('public.%I',item.table_name))
               and am.amname='btree'
               and not i.indisunique and i.indisvalid and i.indisready
               and i.indpred is null and i.indexprs is null
               and bool_and(options.option_value=0)
               and bool_and(collations.collation_oid=a.attcollation)
               and bool_and(opclasses.opcdefault and opclasses.opcintype=a.atttypid)
        into actual_columns, valid_definition
        from pg_index i
        join pg_class index_relation on index_relation.oid=i.indexrelid
        join pg_am am on am.oid=index_relation.relam
        cross join lateral unnest(i.indkey::smallint[]) with ordinality keys(attnum, ordinality)
        join lateral unnest(i.indoption::smallint[]) with ordinality options(option_value, ordinality)
          on options.ordinality=keys.ordinality
        join lateral unnest(i.indcollation::oid[]) with ordinality collations(collation_oid, ordinality)
          on collations.ordinality=keys.ordinality
        join lateral unnest(i.indclass::oid[]) with ordinality classes(opclass_oid, ordinality)
          on classes.ordinality=keys.ordinality
        join pg_attribute a on a.attrelid=i.indrelid and a.attnum=keys.attnum
        join pg_opclass opclasses on opclasses.oid=classes.opclass_oid and opclasses.opcmethod=am.oid
        where i.indexrelid=index_id
        group by i.indrelid,am.amname,i.indisunique,i.indisvalid,i.indisready,i.indpred,i.indexprs;
      if not coalesce(valid_definition,false) or actual_columns <> item.columns then
        raise exception 'Migration 009 incompatible schema: index % has a different definition.', item.index_name;
      end if;
    end if;
  end loop;
end
$migration$;

-- RLS is intentionally deferred. The API connects through DATABASE_URL or
-- POSTGRES_URL, and the deployed role's ownership/BYPASSRLS behavior must be
-- verified before a separately reviewed RLS policy migration is introduced.
comment on table public.company_categories is
  'Tenant catalog categories. API queries must filter by authenticated company_id; RLS is deferred.';
comment on table public.company_brands is
  'Tenant catalog brands. API queries must filter by authenticated company_id; RLS is deferred.';
comment on column public.products.category_id is
  'Optional normalized category reference; normalized IDs govern reference integrity while legacy fields remain supported.';
comment on column public.products.brand_id is
  'Optional normalized brand reference; normalized IDs govern reference integrity while legacy brand remains supported.';

commit;
