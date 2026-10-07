-- Phase E+F: typed product relations (related + fbt).
-- Additive only. Do NOT apply to Production as part of this phase.

-- Required for composite FKs (already present from 010 on most envs).
create unique index if not exists uq_products_company_id_id
  on public.products (company_id, id);

create table if not exists public.product_relations (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  source_product_id text not null,
  target_product_id text not null,
  type text not null check (type in ('related', 'fbt')),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint product_relations_no_self check (source_product_id <> target_product_id),
  constraint product_relations_unique
    unique (company_id, source_product_id, target_product_id, type)
);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'fk_product_relations_source'
  ) then
    alter table public.product_relations
      add constraint fk_product_relations_source
      foreign key (company_id, source_product_id)
      references public.products (company_id, id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'fk_product_relations_target'
  ) then
    alter table public.product_relations
      add constraint fk_product_relations_target
      foreign key (company_id, target_product_id)
      references public.products (company_id, id)
      on delete cascade;
  end if;
end $$;

create index if not exists idx_product_relations_source_type
  on public.product_relations (company_id, source_product_id, type, sort_order);

create index if not exists idx_product_relations_target
  on public.product_relations (company_id, target_product_id);
