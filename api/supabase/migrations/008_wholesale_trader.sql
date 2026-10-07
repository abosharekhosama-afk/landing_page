-- Wholesale pricing & trader account fields
--
-- Adds additive columns for wholesale pricing on variants and trader account
-- types on users. All columns are optional and default to null; existing rows
-- are unaffected.

begin;

-- Trader / wholesale account type for users
alter table public.users
  add column if not exists account_type text not null default 'retail'
  check (account_type in ('retail', 'trader', 'wholesale'));

-- Wholesale price per variant (nullable, falls back to price when not set)
alter table public.product_variants
  add column if not exists wholesale_price numeric(10, 2);

commit;
