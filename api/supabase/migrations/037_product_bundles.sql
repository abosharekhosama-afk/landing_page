-- Product bundles (Phase M): curated multi-product bundles with four pricing modes.
-- Numbering: 037 (not 036). Migration 036 is reserved by feature/site-pages-foundation-phase1 (company_pages).
-- Inventory: availability is derived from component products/variants only.
--   Retail orders on develop do not deduct stock; do NOT add a parallel bundle stock engine here.
-- Additive only. Do NOT apply to Production as part of this phase.

create table if not exists public.product_bundles (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  slug text not null,
  name text not null default '',
  description text not null default '',
  pricing_mode text not null default 'auto_sum'
    check (pricing_mode in ('auto_sum', 'percent_discount', 'fixed_discount', 'fixed_price')),
  discount_value numeric(12, 2) not null default 0 check (discount_value >= 0),
  fixed_price numeric(12, 2) check (fixed_price is null or fixed_price >= 0),
  image_url text not null default '',
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text not null default '',
  updated_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_bundles_company_slug_unique unique (company_id, slug),
  constraint product_bundles_company_id_unique unique (company_id, id),
  constraint product_bundles_schedule_check
    check (starts_at is null or ends_at is null or starts_at <= ends_at)
);

create index if not exists idx_product_bundles_company
  on public.product_bundles (company_id);
create index if not exists idx_product_bundles_company_active_window
  on public.product_bundles (company_id, is_active, starts_at, ends_at);

alter table public.product_bundles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_bundles'
      and policyname = 'Product bundles are scoped to company_id'
  ) then
    create policy "Product bundles are scoped to company_id"
      on public.product_bundles
      for all
      using (company_id = current_setting('app.current_company_id', true));
  end if;
end $$;

create table if not exists public.product_bundle_items (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  bundle_id text not null references public.product_bundles(id) on delete cascade,
  product_id text not null,
  variant_id text not null default '',
  quantity integer not null default 1 check (quantity >= 1),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_bundle_items_company_id_unique unique (company_id, id),
  constraint product_bundle_items_company_bundle_product_variant_unique
    unique (company_id, bundle_id, product_id, variant_id)
);

create index if not exists idx_product_bundle_items_company
  on public.product_bundle_items (company_id);
create index if not exists idx_product_bundle_items_bundle
  on public.product_bundle_items (company_id, bundle_id);

alter table public.product_bundle_items enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_bundle_items'
      and policyname = 'Product bundle items are scoped to company_id'
  ) then
    create policy "Product bundle items are scoped to company_id"
      on public.product_bundle_items
      for all
      using (company_id = current_setting('app.current_company_id', true));
  end if;
end $$;
