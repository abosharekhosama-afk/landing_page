create table if not exists public.users (
  id text primary key,
  name text not null default '',
  email text not null default '',
  phone text not null default '',
  password text not null default '',
  role text not null default 'customer',
  department text not null default '',
  permissions jsonb not null default '[]'::jsonb,
  eb_points numeric not null default 0,
  total_points_earned numeric not null default 0,
  total_points_redeemed numeric not null default 0,
  is_active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id text primary key,
  slug text not null default '',
  name text not null default '',
  name_ar text not null default '',
  category text not null default '',
  category_ar text not null default '',
  brand text not null default '',
  image_url text not null default '',
  hover_image_url text not null default '',
  price numeric not null default 0,
  stock_qty numeric not null default 0,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  color_name text not null default 'Default',
  color_value text not null default '',
  size text not null default '',
  price numeric not null default 0,
  stock numeric not null default 0,
  image_url text not null default '',
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_gallery_images (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  image_url text not null default '',
  sort_order integer not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id text primary key,
  customer_user_id text,
  customer jsonb not null default '{}'::jsonb,
  subtotal numeric not null default 0,
  total numeric not null default 0,
  points_earned numeric not null default 0,
  points_redeemed numeric not null default 0,
  discount_from_points numeric not null default 0,
  payment_method text not null default '',
  status text not null default 'Pending',
  handled_by_employee_id text not null default '',
  assigned_to_employee_id text not null default '',
  created_by_employee_id text not null default '',
  created_by_employee_name text not null default '',
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id text primary key,
  order_id text not null references public.orders(id) on delete cascade,
  product_id text not null default '',
  product_name text not null default '',
  variant_id text not null default '',
  color_name text not null default '',
  color_value text not null default '',
  size text not null default '',
  quantity numeric not null default 1,
  price numeric not null default 0,
  line_total numeric not null default 0,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carts (
  id text primary key,
  user_id text not null,
  items jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_offers (
  id text primary key,
  display_order integer not null default 0,
  is_active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.homepage_category_cards (
  id text primary key,
  card_key text not null default '',
  display_order integer not null default 0,
  is_active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id text primary key,
  type text not null default 'store',
  rating numeric not null default 5,
  status text not null default 'approved',
  is_active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.work_sessions (
  id text primary key,
  employee_id text not null default '',
  date text not null default '',
  login_time timestamptz,
  logout_time timestamptz,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.website_media (
  id text primary key,
  section_key text not null default '',
  section_label text not null default '',
  group_key text not null default 'sections',
  image_url text not null default '',
  title text not null default '',
  subtitle text not null default '',
  link_url text not null default '',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace view public.customers as
select *
from public.users
where role = 'customer';

create index if not exists idx_users_email on public.users (email);
create index if not exists idx_users_role on public.users (role);
create index if not exists idx_products_slug on public.products (slug);
create index if not exists idx_product_variants_product_id on public.product_variants (product_id);
create index if not exists idx_product_gallery_product_id on public.product_gallery_images (product_id);
create index if not exists idx_orders_customer_user_id on public.orders (customer_user_id);
create index if not exists idx_orders_status on public.orders (status);
create index if not exists idx_order_items_order_id on public.order_items (order_id);
create index if not exists idx_website_media_section_key on public.website_media (section_key);

alter table public.users enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_gallery_images enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.carts enable row level security;
alter table public.homepage_offers enable row level security;
alter table public.homepage_category_cards enable row level security;
alter table public.reviews enable row level security;
alter table public.work_sessions enable row level security;
alter table public.website_media enable row level security;
