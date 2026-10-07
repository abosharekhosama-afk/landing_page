-- CPanel Phase 3: read-only Phase 1 staging readiness checks.
-- Run in the Supabase SQL editor against a backed-up staging project only.
-- These statements inspect catalog metadata and existing rows. They do not
-- alter schemas, identities, tenant records, or storefront data.

-- 1. Required current and target table existence.
with expected_tables(table_name, phase) as (
  values
    ('users', 'existing'),
    ('products', 'existing'),
    ('orders', 'existing'),
    ('website_media', 'existing'),
    ('homepage_offers', 'existing'),
    ('homepage_category_cards', 'existing'),
    ('reviews', 'existing'),
    ('carts', 'existing'),
    ('work_sessions', 'existing'),
    ('companies', 'phase1_target'),
    ('company_domains', 'phase1_target'),
    ('company_memberships', 'phase1_target'),
    ('company_settings', 'phase1_target'),
    ('product_field_definitions', 'phase1_target'),
    ('product_field_values', 'phase1_target')
)
select
  phase,
  table_name,
  to_regclass(format('public.%I', table_name)) is not null as table_exists
from expected_tables
order by phase, table_name;

-- 2. Exact current data counts. These are all tables in the current API schema.
select 'users' as table_name, count(*) as row_count from public.users
union all select 'products', count(*) from public.products
union all select 'orders', count(*) from public.orders
union all select 'website_media', count(*) from public.website_media
union all select 'homepage_offers', count(*) from public.homepage_offers
union all select 'homepage_category_cards', count(*) from public.homepage_category_cards
union all select 'reviews', count(*) from public.reviews
union all select 'carts', count(*) from public.carts
union all select 'work_sessions', count(*) from public.work_sessions
order by table_name;

-- 3. Identity blocker for the normalized-email unique index.
-- Resolve every returned group before applying the migration. Password and
-- password-hash columns are intentionally not selected.
select
  lower(btrim(email)) as normalized_email,
  count(*) as duplicate_count,
  array_agg(id order by id) as user_ids
from public.users
where btrim(email) <> ''
group by lower(btrim(email))
having count(*) > 1
order by normalized_email;

-- 4. Expected column readiness through catalog metadata. Missing target-table
-- rows are normal before Phase 1; missing users columns are pre-migration blockers.
with expected_columns(table_name, column_name) as (
  values
    ('users', 'role'),
    ('users', 'email'),
    ('companies', 'slug'),
    ('companies', 'status'),
    ('companies', 'is_default'),
    ('company_domains', 'domain'),
    ('company_domains', 'is_active')
)
select
  expected.table_name,
  expected.column_name,
  columns.column_name is not null as column_exists
from expected_columns expected
left join information_schema.columns columns
  on columns.table_schema = 'public'
 and columns.table_name = expected.table_name
 and columns.column_name = expected.column_name
order by expected.table_name, expected.column_name;

-- 5. Post-migration company state. This anonymous block remains read-only and
-- reports notices instead of failing when Phase 1 tables do not exist yet.
do $phase1_readiness$
declare
  company_count bigint;
  default_count bigint;
  eb_count bigint;
  active_non_default_domain_count bigint;
begin
  if to_regclass('public.companies') is null then
    raise notice 'Phase 1 not applied: public.companies is absent.';
  else
    execute 'select count(*) from public.companies' into company_count;
    execute 'select count(*) from public.companies where is_default = true' into default_count;
    execute $query$
      select count(*)
      from public.companies
      where id = 'eb-chemical'
        and slug = 'eb-chemical'
        and status = 'active'
        and is_default = true
    $query$ into eb_count;

    raise notice 'companies rows: %', company_count;
    raise notice 'default companies: % (expected 1)', default_count;
    raise notice 'active/default EB Chemical rows: % (expected 1)', eb_count;
  end if;

  if to_regclass('public.companies') is not null
     and to_regclass('public.company_domains') is not null then
    execute $query$
      select count(*)
      from public.company_domains domains
      left join public.companies companies on companies.id = domains.company_id
      where domains.is_active = true
        and coalesce(companies.is_default, false) = false
    $query$ into active_non_default_domain_count;
    raise notice 'active non-default domains: % (expected 0 while resolver is disabled)',
      active_non_default_domain_count;
  else
    raise notice 'Company domain checks wait until all Phase 1 company tables exist.';
  end if;
end
$phase1_readiness$;

-- 6. Confirm the migration's key safeguards after staging application.
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'ux_users_email_normalized',
    'ux_companies_one_default',
    'idx_company_domains_lookup'
  )
order by indexname;
