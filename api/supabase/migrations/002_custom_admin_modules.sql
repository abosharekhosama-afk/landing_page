begin;

create table if not exists public.custom_admin_modules (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  key text not null,
  label text not null,
  description text not null default '',
  icon text not null default 'folder',
  sidebar_order integer not null default 100,
  enabled boolean not null default true,
  fields_schema jsonb not null default '[]'::jsonb,
  list_config jsonb not null default '{}'::jsonb,
  form_config jsonb not null default '{}'::jsonb,
  permissions jsonb not null default '{}'::jsonb,
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, key),
  unique (id, company_id),
  check (key ~ '^[a-z][a-z0-9_]{1,49}$'),
  check (jsonb_typeof(fields_schema) = 'array'),
  check (jsonb_typeof(list_config) = 'object'),
  check (jsonb_typeof(form_config) = 'object'),
  check (jsonb_typeof(permissions) = 'object')
);

create index if not exists idx_custom_admin_modules_company_enabled_order
  on public.custom_admin_modules (company_id, enabled, sidebar_order);

create table if not exists public.custom_admin_module_entries (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  module_id text not null,
  data jsonb not null default '{}'::jsonb,
  status text not null default 'active',
  created_by text,
  updated_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (module_id, company_id)
    references public.custom_admin_modules(id, company_id) on delete cascade,
  check (jsonb_typeof(data) = 'object'),
  check (status in ('active', 'deleted'))
);

create index if not exists idx_custom_admin_module_entries_company_module_status
  on public.custom_admin_module_entries (company_id, module_id, status, updated_at desc);

comment on table public.custom_admin_modules is
  'Safe declarative definitions for tenant-specific admin modules. No executable code is stored.';
comment on table public.custom_admin_module_entries is
  'Schema-validated tenant records belonging to custom admin modules.';

alter table public.custom_admin_modules enable row level security;
alter table public.custom_admin_module_entries enable row level security;

commit;
