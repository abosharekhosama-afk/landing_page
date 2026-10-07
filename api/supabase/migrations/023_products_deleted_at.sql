-- Migration 023: Product soft-delete (Trash lifecycle — Phase G)
-- Adds nullable deleted_at for soft delete. Normal DELETE moves products to Trash.
-- Permanent delete remains a separate privileged operation.
-- DO NOT apply this migration to Production without review.

alter table public.products
  add column if not exists deleted_at timestamptz;

create index if not exists idx_products_company_deleted_at
  on public.products (company_id, deleted_at);
