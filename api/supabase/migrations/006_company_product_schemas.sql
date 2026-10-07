begin;

create table if not exists public.company_product_schemas (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  schema_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id),
  check (jsonb_typeof(schema_json) = 'object')
);

create index if not exists idx_company_product_schemas_company_id
  on public.company_product_schemas (company_id);

comment on table public.company_product_schemas is
  'Validated per-company product form, variant, media, showcase, and storefront configuration.';

alter table public.company_product_schemas enable row level security;

commit;
