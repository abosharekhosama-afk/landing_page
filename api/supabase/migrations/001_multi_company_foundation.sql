-- Phase 1: additive multi-company database foundation only.
--
-- EB Chemical remains the only enabled/default tenant. This migration does not
-- change application routing, authentication, queries, persistence, or UI.
-- Do not create or enable a second company until every backend read, write,
-- delete, export, and prune operation is scoped and authorized by company_id.
--
-- The temporary company_id default is intentional: the current backend does
-- not send company_id yet, so unchanged EB Chemical writes must keep working.

begin;

-- Authentication treats email addresses case-insensitively. Resolve every
-- legacy duplicate returned by this preflight query before applying the unique
-- index in staging; the migration intentionally fails instead of deleting or
-- merging identity records automatically:
--
-- select lower(btrim(email)) as normalized_email, count(*)
-- from public.users
-- where btrim(email) <> ''
-- group by lower(btrim(email))
-- having count(*) > 1;
create unique index if not exists ux_users_email_normalized
  on public.users (lower(btrim(email)))
  where btrim(email) <> '';

create table if not exists public.companies (
  id text primary key,
  slug text not null unique,
  name text not null,
  status text not null default 'draft'
    check (status in ('draft', 'inactive', 'active')),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- CPanel Phase 1 creates non-operational company drafts. Recreate the named
-- check safely when validating this draft against a staging database that may
-- already contain the earlier inactive/active/suspended foundation constraint.
alter table public.companies
  drop constraint if exists companies_status_check;
alter table public.companies
  add constraint companies_status_check
  check (status in ('draft', 'inactive', 'active'));

-- Allow only one platform default while still permitting zero defaults during
-- a future controlled migration.
create unique index if not exists ux_companies_one_default
  on public.companies (is_default)
  where is_default = true;

insert into public.companies (id, slug, name, status, is_default)
values ('eb-chemical', 'eb-chemical', 'EB Chemical', 'active', true)
on conflict (id) do update
set
  slug = excluded.slug,
  name = excluded.name,
  status = excluded.status,
  is_default = excluded.is_default,
  updated_at = now();

create table if not exists public.company_domains (
  id text primary key,
  company_id text not null references public.companies(id) on delete restrict,
  domain text not null unique,
  is_primary boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (domain = lower(domain)),
  check (domain not like '%/%')
);

create index if not exists idx_company_domains_company_id
  on public.company_domains (company_id);
create index if not exists idx_company_domains_lookup
  on public.company_domains (domain, is_active);

-- Draft mapping for the EB Chemical host already referenced by this project.
-- The runtime does not read this table in Phase 1, so local development remains
-- unchanged. A later company resolver should treat localhost/127.0.0.1 and a
-- configured DEFAULT_COMPANY_ID as EB Chemical development fallbacks instead of
-- requiring ports or machine-specific hosts to be stored here.
insert into public.company_domains (id, company_id, domain, is_primary, is_active)
values (
  'eb-chemical-domain-vercel',
  'eb-chemical',
  'eb-chemical-full.vercel.app',
  true,
  true
)
on conflict do nothing;

-- Optional development mappings can be inserted later if domain resolution
-- requires them. They are intentionally comments, not production assumptions:
-- insert into public.company_domains (id, company_id, domain, is_primary)
-- values ('eb-chemical-domain-localhost', 'eb-chemical', 'localhost', false);
-- insert into public.company_domains (id, company_id, domain, is_primary)
-- values ('eb-chemical-domain-loopback', 'eb-chemical', '127.0.0.1', false);

create table if not exists public.company_memberships (
  id text primary key,
  company_id text not null references public.companies(id) on delete restrict,
  user_id text not null references public.users(id) on delete cascade,
  role text not null
    check (role in ('super_admin', 'company_admin', 'employee', 'customer')),
  permissions jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_company_memberships_user_id
  on public.company_memberships (user_id);
create index if not exists idx_company_memberships_company_role
  on public.company_memberships (company_id, role, is_active);

-- Preserve public.users as the global identity table. Existing roles remain in
-- place for the current runtime; memberships are an additive tenant-scoped copy.
insert into public.company_memberships (
  id,
  company_id,
  user_id,
  role,
  permissions,
  is_active
)
select
  'eb-chemical:' || users.id,
  'eb-chemical',
  users.id,
  case
    when users.role = 'admin' then 'company_admin'
    when users.role in ('employee', 'staff', 'manager') then 'employee'
    else 'customer'
  end,
  coalesce(users.permissions, '[]'::jsonb),
  users.is_active
from public.users
on conflict (company_id, user_id) do nothing;

create table if not exists public.company_settings (
  company_id text primary key references public.companies(id) on delete cascade,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.company_settings (company_id, settings)
values ('eb-chemical', '{}'::jsonb)
on conflict (company_id) do nothing;

create table if not exists public.product_field_definitions (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  field_key text not null,
  label jsonb not null default '{}'::jsonb,
  field_type text not null default 'text',
  validation jsonb not null default '{}'::jsonb,
  options jsonb not null default '[]'::jsonb,
  sort_order integer not null default 0,
  is_required boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, field_key)
);

create index if not exists idx_product_field_definitions_company_id
  on public.product_field_definitions (company_id);

create table if not exists public.product_field_values (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  field_definition_id text not null
    references public.product_field_definitions(id) on delete cascade,
  value jsonb not null default 'null'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, product_id, field_definition_id)
);

create index if not exists idx_product_field_values_company_product
  on public.product_field_values (company_id, product_id);

-- Additive tenant ownership for tables present in the current schema and for
-- explicitly named future-compatible tables only when they already exist.
-- public.users is intentionally excluded: identity is global and tenant access
-- is represented by company_memberships. Existing customer/employee roles are
-- still left untouched for runtime compatibility.
do $$
declare
  target_table text;
  constraint_name text;
begin
  foreach target_table in array array[
    'products',
    'product_variants',
    'product_gallery_images',
    'categories',
    'orders',
    'order_items',
    'carts',
    'cart_items',
    'reviews',
    'website_media',
    'homepage_offers',
    'homepage_category_cards',
    'customer_profiles',
    'employees',
    'work_sessions'
  ]
  loop
    if to_regclass(format('%I.%I', 'public', target_table)) is null then
      raise notice 'Skipping %.% because the table does not exist.', 'public', target_table;
      continue;
    end if;

    execute format(
      'alter table public.%I add column if not exists company_id text',
      target_table
    );
    execute format(
      'alter table public.%I alter column company_id set default %L',
      target_table,
      'eb-chemical'
    );
    execute format(
      'update public.%I set company_id = %L where company_id is null or btrim(company_id) = %L',
      target_table,
      'eb-chemical',
      ''
    );
    execute format(
      'alter table public.%I alter column company_id set not null',
      target_table
    );

    constraint_name := 'fk_' || target_table || '_company';
    if not exists (
      select 1
      from pg_constraint
      where conname = constraint_name
        and conrelid = to_regclass(format('%I.%I', 'public', target_table))
    ) then
      execute format(
        'alter table public.%I add constraint %I foreign key (company_id) references public.companies(id) on delete restrict not valid',
        target_table,
        constraint_name
      );
    end if;

    execute format(
      'create index if not exists %I on public.%I (company_id)',
      'idx_' || target_table || '_company_id',
      target_table
    );
  end loop;
end
$$;

-- Non-unique composite indexes prepare company-scoped lookups without changing
-- which rows the current runtime is allowed to create.
do $$
declare
  item record;
begin
  for item in
    select *
    from (values
      ('products', 'slug', 'idx_products_company_slug'),
      ('categories', 'slug', 'idx_categories_company_slug'),
      ('orders', 'status', 'idx_orders_company_status'),
      ('website_media', 'section_key', 'idx_website_media_company_section'),
      ('homepage_category_cards', 'card_key', 'idx_homepage_cards_company_key'),
      ('work_sessions', 'employee_id', 'idx_work_sessions_company_employee')
    ) as candidates(table_name, column_name, index_name)
  loop
    if to_regclass(format('%I.%I', 'public', item.table_name)) is not null
      and exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = item.table_name
          and column_name = item.column_name
      ) then
      execute format(
        'create index if not exists %I on public.%I (company_id, %I)',
        item.index_name,
        item.table_name,
        item.column_name
      );
    end if;
  end loop;
end
$$;

-- Tenant-scoped uniqueness is intentionally not enforced in Phase 1. Before a
-- later migration adds unique indexes on (company_id, slug) or
-- (company_id, section_key), validate current data with queries such as:
--
-- select company_id, slug, count(*)
-- from public.products
-- where nullif(btrim(slug), '') is not null
-- group by company_id, slug
-- having count(*) > 1;
--
-- select company_id, section_key, count(*)
-- from public.website_media
-- where nullif(btrim(section_key), '') is not null
-- group by company_id, section_key
-- having count(*) > 1;

comment on table public.companies is
  'Phase 1 multi-company foundation. EB Chemical remains the only enabled tenant.';
comment on table public.company_domains is
  'Domain mappings are not consumed by the runtime until company resolution is implemented.';
comment on table public.company_memberships is
  'Tenant-scoped roles copied from existing users without changing current authentication behavior.';
comment on table public.company_settings is
  'Tenant settings foundation; existing localStorage settings are not migrated in Phase 1.';
comment on table public.product_field_definitions is
  'Company-specific product field definitions; not consumed by the runtime in Phase 1.';
comment on table public.product_field_values is
  'Company-specific product field values; not consumed by the runtime in Phase 1.';

-- RLS is enabled as defense-in-depth preparation. No direct client policies are
-- added here; the current backend continues using its server-side service role.
alter table public.companies enable row level security;
alter table public.company_domains enable row level security;
alter table public.company_memberships enable row level security;
alter table public.company_settings enable row level security;
alter table public.product_field_definitions enable row level security;
alter table public.product_field_values enable row level security;

commit;

-- Phase 1 stop condition:
-- Do not insert another company yet. The current global store snapshot and
-- pruneMissing persistence paths are not tenant-safe.
