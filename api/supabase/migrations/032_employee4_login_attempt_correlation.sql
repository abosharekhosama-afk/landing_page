-- Employee 4 Task 10/11: correlate one authentication request across
-- multiple tenant memberships without storing additional authentication data.
alter table public.company_login_history
  add column if not exists attempt_id text;

create index if not exists idx_company_login_history_attempt
  on public.company_login_history(company_id, attempt_id);
