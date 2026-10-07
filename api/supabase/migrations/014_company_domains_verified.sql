-- Add is_verified column to company_domains for tenant resolution gate.
-- Only active AND verified domains will resolve to a company at runtime.

begin;

alter table public.company_domains
  add column if not exists is_verified boolean not null default false;

alter table public.company_domains
  drop constraint if exists company_domains_domain_check;

alter table public.company_domains
  add constraint company_domains_domain_check
  check (domain = lower(domain) and domain not like '%/%');

-- Mark all pre-existing active domains as verified so existing resolution works.
update public.company_domains
set is_verified = true
where is_active = true;

commit;
