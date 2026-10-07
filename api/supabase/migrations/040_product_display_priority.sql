-- Product display priority (specs/004-product-display-priority, task T003).
--
-- DO NOT apply this file to Staging or Production.
-- Writing the migration file is approved. Applying it to any shared
-- environment (Staging, Production) requires a new explicit approval from
-- the project owner. Use it only against a disposable local test database.
--
-- Tables:
--   product_display_modes - one configuration row per
--                            (company_id, surface, brand_id). brand_id null
--                            is the surface-global row; a brand id is an
--                            override. ordering_key, selection_match, and
--                            selection stay nullable so a brand can inherit
--                            each field independently. A null selection means
--                            inherit; an explicit empty rules array is '[]'
--                            and means "all eligible products".
--   product_display_order - manual position rows for one configuration
--                            scope. Stores product ids and positions only;
--                            never copies product fields.
--
-- Follows api/supabase/migrations/024_product_relations.sql for the
-- (company_id, product_id) composite foreign key.

-- Required for the composite product foreign key (also created by 024).
create unique index if not exists uq_products_company_id_id
  on public.products (company_id, id);

create table if not exists public.product_display_modes (
  company_id text not null references public.companies(id) on delete cascade,
  surface text not null check (surface in ('home', 'shop')),
  brand_id text null,
  ordering_key text null,
  selection_match text null check (selection_match is null or selection_match in ('and', 'or')),
  selection jsonb null,
  updated_at timestamptz not null default now(),
  constraint uq_product_display_modes unique (company_id, surface, brand_id)
);

-- brand_id is nullable and SQL unique constraints treat NULLs as distinct,
-- so the surface-global row (brand_id null) needs its own partial index.
create unique index if not exists uq_product_display_modes_global
  on public.product_display_modes (company_id, surface)
  where brand_id is null;

create index if not exists idx_company_product_display_modes
  on public.product_display_modes (company_id, surface);

create table if not exists public.product_display_order (
  company_id text not null references public.companies(id) on delete cascade,
  surface text not null check (surface in ('home', 'shop')),
  brand_id text null,
  product_id text not null,
  position integer not null default 0,
  constraint uq_product_display_order
    unique (company_id, surface, brand_id, product_id),
  constraint fk_product_display_order_product
    foreign key (company_id, product_id)
    references public.products (company_id, id)
    on delete cascade
);

create unique index if not exists uq_product_display_order_global
  on public.product_display_order (company_id, surface, product_id)
  where brand_id is null;

create index if not exists idx_company_product_display_order
  on public.product_display_order (company_id, surface, brand_id, position);
