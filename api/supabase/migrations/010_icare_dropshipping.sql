begin;

create table if not exists public.dropshipping_settings (
  company_id text primary key references public.companies(id) on delete restrict,
  dropshipping_enabled boolean not null default false,
  default_fixed_fee numeric(14,2) not null default 0 check (default_fixed_fee >= 0),
  default_percentage_fee numeric(7,4) not null default 0 check (default_percentage_fee between 0 and 100),
  default_minimum_order numeric(14,2) not null default 0 check (default_minimum_order >= 0),
  minimum_withdrawal_amount numeric(14,2) not null default 0 check (minimum_withdrawal_amount >= 0),
  profit_release_delay_days integer not null default 7 check (profit_release_delay_days >= 0),
  marketer_price_limit_type text not null default 'both' check (marketer_price_limit_type in ('markup','absolute','both')),
  default_maximum_markup numeric(14,2),
  default_maximum_selling_price numeric(14,2),
  allow_video_download boolean not null default true,
  allow_image_download boolean not null default true,
  require_admin_order_confirmation boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.dropshipper_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id text not null references public.companies(id) on delete restrict,
  user_id text not null references public.users(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending','approved','rejected','suspended')),
  full_name text not null, phone text not null, address text, region text,
  social_media_accounts jsonb not null default '{}'::jsonb check (jsonb_typeof(social_media_accounts) = 'object'),
  notes text, approved_by text references public.users(id) on delete set null, approved_at timestamptz,
  rejected_by text references public.users(id) on delete set null, rejected_at timestamptz, rejection_reason text,
  suspended_at timestamptz, suspension_reason text,
  maximum_markup numeric(14,2), maximum_selling_price numeric(14,2),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (company_id, user_id), unique (company_id, id)
);
create unique index if not exists uq_dropshipper_phone on public.dropshipper_profiles(company_id, phone);
create index if not exists idx_dropshipper_profiles_status on public.dropshipper_profiles(company_id,status,created_at desc);

create unique index if not exists uq_products_company_id_id on public.products(company_id,id);
create unique index if not exists uq_product_variants_company_product_id on public.product_variants(company_id,product_id,id);

create table if not exists public.dropshipping_products (
  id uuid primary key default gen_random_uuid(), company_id text not null references public.companies(id) on delete restrict,
  product_id text not null, enabled boolean not null default false,
  dropshipping_price numeric(14,2) not null default 0 check (dropshipping_price >= 0),
  suggested_selling_price numeric(14,2), minimum_selling_price numeric(14,2), maximum_selling_price numeric(14,2),
  marketer_fee numeric(14,2) not null default 0, fixed_fee numeric(14,2), percentage_fee numeric(7,4),
  available_stock integer check (available_stock is null or available_stock >= 0), allow_media_download boolean not null default true,
  marketing_caption jsonb not null default '{}'::jsonb, marketing_hashtags text[] not null default '{}',
  social_short_description jsonb not null default '{}'::jsonb, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(company_id,product_id), unique(company_id,id),
  foreign key(company_id,product_id) references public.products(company_id,id) on delete cascade,
  check (minimum_selling_price is null or maximum_selling_price is null or minimum_selling_price <= maximum_selling_price)
);
create index if not exists idx_dropshipping_products_enabled on public.dropshipping_products(company_id,enabled,product_id);

create table if not exists public.dropshipping_product_media (
  id uuid primary key default gen_random_uuid(), company_id text not null, product_id text not null,
  media_type text not null check(media_type in ('image','video','document','zip')),
  public_url text not null check(public_url ~ '^https?://' or public_url like '/uploads/%' or public_url like '/public/uploads/%'),
  title jsonb not null default '{}'::jsonb, downloadable boolean not null default true,
  sort_order integer not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(company_id,product_id) references public.dropshipping_products(company_id,product_id) on delete cascade,
  unique(company_id,id), unique(company_id,product_id,public_url)
);
create index if not exists idx_dropshipping_product_media on public.dropshipping_product_media(company_id,product_id,sort_order);

create table if not exists public.dropshipping_orders (
  id uuid primary key default gen_random_uuid(), company_id text not null references public.companies(id) on delete restrict,
  dropshipper_id uuid not null, customer_name text not null, customer_phone text not null, customer_secondary_phone text,
  delivery_address text not null, region text not null, notes text,
  customer_selling_total numeric(14,2) not null check(customer_selling_total>=0), dropshipping_cost_total numeric(14,2) not null check(dropshipping_cost_total>=0),
  fees_total numeric(14,2) not null check(fees_total>=0), marketer_profit numeric(14,2) not null check(marketer_profit>=0),
  payment_method text not null default 'cash_on_delivery', delivery_status text not null default 'new'
    check(delivery_status in ('new','confirmed','preparing','ready_for_delivery','out_for_delivery','delivered','cancelled','returned')),
  profit_status text not null default 'pending_order' check(profit_status in ('pending_order','pending_release','approved','cancelled','reversed')),
  return_status text not null default 'none' check(return_status in ('none','protected','expired','returned')),
  delivered_at timestamptz, returned_at timestamptz, cancelled_at timestamptz, idempotency_key text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(company_id,dropshipper_id) references public.dropshipper_profiles(company_id,id) on delete restrict,
  unique(company_id,id), unique(company_id,idempotency_key)
);
create index if not exists idx_dropshipping_orders_owner on public.dropshipping_orders(company_id,dropshipper_id,created_at desc);
create index if not exists idx_dropshipping_orders_status on public.dropshipping_orders(company_id,delivery_status,created_at desc);

create table if not exists public.dropshipping_order_items (
  id uuid primary key default gen_random_uuid(), company_id text not null, order_id uuid not null, product_id text not null,
  variant_id text, quantity integer not null check(quantity>0), dropshipping_unit_price numeric(14,2) not null,
  customer_unit_price numeric(14,2) not null, fee_amount numeric(14,2) not null, marketer_profit numeric(14,2) not null,
  product_snapshot jsonb not null, created_at timestamptz not null default now(),
  foreign key(company_id,order_id) references public.dropshipping_orders(company_id,id) on delete cascade,
  foreign key(company_id,product_id) references public.products(company_id,id) on delete restrict,
  foreign key(company_id,product_id,variant_id) references public.product_variants(company_id,product_id,id) on delete restrict
);
create index if not exists idx_dropshipping_items_order on public.dropshipping_order_items(company_id,order_id);

create table if not exists public.dropshipping_order_status_history (
  id bigserial primary key, company_id text not null, order_id uuid not null, from_status text, to_status text not null,
  note text, created_by text references public.users(id) on delete set null, created_at timestamptz not null default now(),
  foreign key(company_id,order_id) references public.dropshipping_orders(company_id,id) on delete cascade
);

create table if not exists public.dropshipper_wallets (
  id uuid primary key default gen_random_uuid(), company_id text not null, dropshipper_id uuid not null,
  available_balance numeric(14,2) not null default 0 check(available_balance>=0), pending_balance numeric(14,2) not null default 0 check(pending_balance>=0),
  withdrawal_reserved numeric(14,2) not null default 0 check(withdrawal_reserved>=0), paid_balance numeric(14,2) not null default 0 check(paid_balance>=0),
  debt_balance numeric(14,2) not null default 0 check(debt_balance>=0),
  lifetime_earnings numeric(14,2) not null default 0 check(lifetime_earnings>=0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key(company_id,dropshipper_id) references public.dropshipper_profiles(company_id,id) on delete restrict,
  unique(company_id,dropshipper_id), unique(company_id,id)
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(), company_id text not null, dropshipper_id uuid not null, amount numeric(14,2) not null check(amount>0),
  payment_method text not null, payment_details jsonb not null, status text not null default 'pending' check(status in ('pending','approved','paid','rejected','cancelled')),
  requested_at timestamptz not null default now(), approved_at timestamptz, paid_at timestamptz, rejected_at timestamptz,
  rejection_reason text, processed_by text references public.users(id) on delete set null, reference_number text,
  foreign key(company_id,dropshipper_id) references public.dropshipper_profiles(company_id,id) on delete restrict,
  unique(company_id,id)
);
create unique index if not exists uq_withdrawal_active on public.withdrawal_requests(company_id,dropshipper_id) where status in ('pending','approved');

create table if not exists public.dropshipper_transactions (
  id uuid primary key default gen_random_uuid(), company_id text not null, dropshipper_id uuid not null,
  order_id uuid, withdrawal_request_id uuid, amount numeric(14,2) not null,
  available_impact numeric(14,2) not null default 0, pending_impact numeric(14,2) not null default 0,
  reserved_impact numeric(14,2) not null default 0, paid_impact numeric(14,2) not null default 0,
  debt_impact numeric(14,2) not null default 0,
  transaction_type text not null check(transaction_type in ('earning_pending','earning_approved','earning_cancelled','earning_reversed','withdrawal_requested','withdrawal_paid','withdrawal_rejected','manual_adjustment')),
  description text not null, created_by text references public.users(id) on delete set null, idempotency_key text not null,
  created_at timestamptz not null default now(),
  foreign key(company_id,dropshipper_id) references public.dropshipper_profiles(company_id,id) on delete restrict,
  foreign key(company_id,order_id) references public.dropshipping_orders(company_id,id) on delete restrict,
  foreign key(company_id,withdrawal_request_id) references public.withdrawal_requests(company_id,id) on delete restrict,
  unique(company_id,idempotency_key)
);
create index if not exists idx_dropshipper_transactions_owner on public.dropshipper_transactions(company_id,dropshipper_id,created_at desc);

create table if not exists public.dropshipping_notifications (
  id uuid primary key default gen_random_uuid(), company_id text not null references public.companies(id) on delete restrict,
  user_id text references public.users(id) on delete cascade, audience text not null check(audience in ('admin','dropshipper')),
  type text not null, title text not null, body text not null, payload jsonb not null default '{}'::jsonb,
  read_at timestamptz, created_at timestamptz not null default now()
);
create index if not exists idx_dropshipping_notifications_user on public.dropshipping_notifications(company_id,user_id,created_at desc);

insert into public.dropshipping_settings(company_id,dropshipping_enabled)
select id, false from public.companies on conflict(company_id) do nothing;

commit;
