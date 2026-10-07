-- Phase 0: Company Sites Foundation
-- Tenant-scoped sites table for multi-site management.

begin;

create table if not exists public.company_sites (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  slug text not null,
  name text not null,
  status text not null default 'active' check (status in ('active', 'draft', 'archived')),
  default_locale text not null default 'en',
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, slug)
);

comment on table public.company_sites is 'Tenant-scoped sites (storefronts) managed by the CPanel.';
comment on column public.company_sites.slug is 'URL-friendly identifier unique within the owning company.';
comment on column public.company_sites.status is 'Lifecycle status: active, draft, or archived.';

-- Indexes
create index if not exists idx_company_sites_company on public.company_sites(company_id);
create index if not exists idx_company_sites_company_created on public.company_sites(company_id, created_at desc);

-- Row Level Security
alter table public.company_sites enable row level security;

drop policy if exists "Users can view their company''s sites" on public.company_sites;
create policy "Users can view their company''s sites"
  on public.company_sites for select
  using (company_id = current_setting('app.current_company_id', true));

drop policy if exists "Users can insert their company''s sites" on public.company_sites;
create policy "Users can insert their company''s sites"
  on public.company_sites for insert
  with check (company_id = current_setting('app.current_company_id', true));

drop policy if exists "Users can update their company''s sites" on public.company_sites;
create policy "Users can update their company''s sites"
  on public.company_sites for update
  using (company_id = current_setting('app.current_company_id', true));

drop policy if exists "Users can delete their company''s sites" on public.company_sites;
create policy "Users can delete their company''s sites"
  on public.company_sites for delete
  using (company_id = current_setting('app.current_company_id', true));

-- Trigger to update updated_at
drop trigger if exists update_company_sites_updated_at on public.company_sites;
create trigger update_company_sites_updated_at
  before update on public.company_sites
  for each row
  execute function update_updated_at_column();

-- Safe backfill: for each company with no site rows, create a default site
-- from the existing websiteConnection settings (if present).
-- This does NOT delete or modify websiteConnection data.
-- company_sites.id is a global primary key, so it is company-prefixed even
-- when two companies share the same legacy websiteConnection.siteId.
insert into public.company_sites (id, company_id, slug, name, status, default_locale, settings, created_at, updated_at)
select
  c.id || '-' || coalesce(nullif((c.settings->'websiteConnection'->>'siteId'), ''), 'storefront') as id,
  c.id as company_id,
  coalesce(
    (c.settings->'websiteConnection'->>'siteId'),
    c.id || '-storefront'
  ) as slug,
  c.name as name,
  'active' as status,
  coalesce(
    (c.settings->'websiteConnection'->>'defaultLocale'),
    'en'
  ) as default_locale,
  case
    when nullif((c.settings->'websiteConnection'->>'siteId'), '') is not null
    then jsonb_build_object('legacyWebsiteConnectionSiteId', (c.settings->'websiteConnection'->>'siteId'))
    else '{}'::jsonb
  end as settings,
  now() as created_at,
  now() as updated_at
from public.companies c
where not exists (
  select 1 from public.company_sites s where s.company_id = c.id
)
on conflict (id) do nothing;

commit;
