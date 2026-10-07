-- Velvet Dropshipping. Company-scoped and separate from iCare dropshipping.
-- Do not apply this file to a shared, staging, or production database without approval.

create table if not exists public.velvet_dropship_merchants (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  user_id text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  payout_method text check (payout_method in ('bank', 'wallet', 'direct_handover')),
  payout_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table if not exists public.velvet_dropship_stores (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  merchant_id uuid not null references public.velvet_dropship_merchants(id),
  name text not null,
  slug text not null,
  logo_url text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, slug),
  unique (merchant_id)
);

create table if not exists public.velvet_dropship_offers (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  product_id text not null,
  variant_id text,
  selling_unit_price numeric(14,2) not null,
  merchant_unit_price numeric(14,2) not null,
  clean_image_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merchant_unit_price <= selling_unit_price)
);

create unique index if not exists velvet_dropship_offers_product_idx
  on public.velvet_dropship_offers (company_id, product_id, coalesce(variant_id, ''));

create table if not exists public.velvet_dropship_merchant_products (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  merchant_id uuid not null references public.velvet_dropship_merchants(id),
  offer_id uuid not null references public.velvet_dropship_offers(id),
  generated_image_url text,
  image_status text not null default 'fallback' check (image_status in ('ready', 'generation_failed', 'fallback')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (merchant_id, offer_id)
);

create table if not exists public.velvet_dropship_orders (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  merchant_id uuid not null references public.velvet_dropship_merchants(id),
  store_id uuid not null references public.velvet_dropship_stores(id),
  status text not null,
  customer_name text not null,
  customer_phone text not null,
  city text not null,
  address text not null,
  delivery_amount numeric(14,2),
  delivery_amount_status text not null default 'not_set',
  merchandise_total numeric(14,2) not null default 0,
  merchant_profit_total numeric(14,2) not null default 0,
  held_fulfillment_status text,
  whatsapp_attempt_count integer not null default 0,
  whatsapp_attempt_day date,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);

create table if not exists public.velvet_dropship_order_lines (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  order_id uuid not null references public.velvet_dropship_orders(id),
  offer_id uuid not null,
  product_id text not null,
  variant_id text,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  selling_unit_price numeric(14,2) not null,
  merchant_unit_price numeric(14,2) not null,
  profit_unit_amount numeric(14,2) not null,
  line_status text not null default 'active' check (line_status in ('active', 'missing_in_warehouse', 'removed', 'replaced')),
  replaces_line_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.velvet_dropship_inventory_movements (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  order_id uuid,
  line_id uuid,
  product_id text not null,
  variant_id text,
  reason text not null,
  qty_delta integer not null,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (company_id, idempotency_key)
);

create table if not exists public.velvet_dropship_settlements (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  merchant_id uuid not null references public.velvet_dropship_merchants(id),
  thursday date not null,
  total_profit numeric(14,2) not null default 0,
  payout_method text,
  payout_details jsonb not null default '{}'::jsonb,
  reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, merchant_id, thursday)
);

create table if not exists public.velvet_dropship_settlement_lines (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  settlement_id uuid not null references public.velvet_dropship_settlements(id),
  order_id uuid not null references public.velvet_dropship_orders(id),
  profit_amount numeric(14,2) not null,
  unique (order_id)
);

create table if not exists public.velvet_dropship_notifications (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  merchant_id uuid not null references public.velvet_dropship_merchants(id),
  order_id uuid,
  kind text not null,
  message text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.velvet_dropship_audit_events (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  actor_user_id text,
  action text not null,
  entity_type text not null,
  entity_id text,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
