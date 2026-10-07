-- Migration 004: Company Delivery Zones
-- Creates company_delivery_zones table for per-company delivery city pricing.

create table if not exists public.company_delivery_zones (
  id text primary key,
  company_id text not null default 'eb-chemical' references public.companies(id) on delete cascade,
  city_key text not null,
  city_name text not null,
  region text not null default '',
  delivery_price numeric(10,2) not null default 0 check (delivery_price >= 0),
  currency text not null default 'ILS',
  enabled boolean not null default true,
  display_order integer not null default 0,
  created_by text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint unique_company_city_key unique (company_id, city_key)
);

create index if not exists idx_company_delivery_zones_company_id on public.company_delivery_zones(company_id);
create index if not exists idx_company_delivery_zones_enabled on public.company_delivery_zones(company_id, enabled);

alter table public.company_delivery_zones enable row level security;

create policy "Delivery zones are scoped to company_id"
  on public.company_delivery_zones
  for all
  using (company_id = current_setting('app.current_company_id', true));

create or replace function public.update_company_delivery_zones_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_company_delivery_zones_updated_at
  before update on public.company_delivery_zones
  for each row
  execute function public.update_company_delivery_zones_updated_at();
