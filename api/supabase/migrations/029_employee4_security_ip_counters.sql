-- Employee 4 Task 11: durable tenant-scoped IP authentication failure counters.
create table if not exists public.company_ip_security (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  ip_address text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  last_failed_at timestamptz,
  unique (company_id, ip_address)
);
create index if not exists idx_company_ip_security_lookup
  on public.company_ip_security(company_id, ip_address);

alter table public.company_ip_security enable row level security;

drop policy if exists service_insert_company_ip_security on public.company_ip_security;
create policy service_insert_company_ip_security
  on public.company_ip_security for insert with check (true);

drop policy if exists company_admins_select_company_ip_security on public.company_ip_security;
create policy company_admins_select_company_ip_security
  on public.company_ip_security for select
  using (company_id = current_setting('app.current_company_id', true)::text);
