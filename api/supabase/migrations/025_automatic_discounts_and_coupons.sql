-- Phase K+L: Automatic / bulk discounts + coupons.
-- Additive only. Do NOT apply to Production as part of this phase.

create table if not exists public.automatic_discounts (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  name text not null default '',
  discount_type text not null default 'percentage'
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  min_quantity integer not null default 1 check (min_quantity >= 1),
  product_ids jsonb not null default '[]'::jsonb,
  category_ids jsonb not null default '[]'::jsonb,
  brand_ids jsonb not null default '[]'::jsonb,
  starts_at timestamptz,
  ends_at timestamptz,
  round_final_price boolean not null default false,
  is_active boolean not null default true,
  created_by text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint automatic_discounts_schedule_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists idx_automatic_discounts_company
  on public.automatic_discounts (company_id);
create index if not exists idx_automatic_discounts_active_window
  on public.automatic_discounts (company_id, is_active, starts_at, ends_at);

alter table public.automatic_discounts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'automatic_discounts'
      and policyname = 'Automatic discounts are scoped to company_id'
  ) then
    create policy "Automatic discounts are scoped to company_id"
      on public.automatic_discounts
      for all
      using (company_id = current_setting('app.current_company_id', true));
  end if;
end $$;

create table if not exists public.coupons (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  code text not null,
  name text not null default '',
  admin_note text not null default '',
  discount_type text not null default 'percentage'
    check (discount_type in ('percentage', 'fixed')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  min_order_amount numeric(12, 2) not null default 0 check (min_order_amount >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_by text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coupons_company_code_unique unique (company_id, code),
  constraint coupons_schedule_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists idx_coupons_company
  on public.coupons (company_id);
create index if not exists idx_coupons_company_code
  on public.coupons (company_id, code);
create index if not exists idx_coupons_active_window
  on public.coupons (company_id, is_active, starts_at, ends_at);

alter table public.coupons enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'coupons'
      and policyname = 'Coupons are scoped to company_id'
  ) then
    create policy "Coupons are scoped to company_id"
      on public.coupons
      for all
      using (company_id = current_setting('app.current_company_id', true));
  end if;
end $$;
