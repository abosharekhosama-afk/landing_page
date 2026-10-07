-- Employee 4: persistence hardening.
-- Additive migration on top of 021_employee4_store_engagement_security.sql.
--
-- Closes the gaps identified by the Task 01 baseline audit:
--   1. Foreign keys from every Employee 4 tenant table to companies(id).
--   2. Referential integrity between company_splash_ad_events and
--      company_splash_ads (analytics preserved on ad deletion -> SET NULL).
--   3. Row Level Security consistent with migrations 001/005/020.
--   4. browser/device columns on company_login_history so the in-memory
--      login record round-trips losslessly through PostgreSQL.
--   5. updated_at maintenance triggers following the 003/004 convention.

-- ---------------------------------------------------------------------------
-- 1. Company foreign keys (idempotent; same additive pattern as migration 001)
-- ---------------------------------------------------------------------------
do $$
declare
  target_table text;
  constraint_name text;
begin
  foreach target_table in array array[
    'company_sms_logs',
    'company_sms_automations',
    'company_announcements',
    'company_splash_ads',
    'company_splash_ad_events',
    'company_store_policies',
    'company_legal_information',
    'company_login_history',
    'company_login_security',
    'company_ip_blocks'
  ]
  loop
    if to_regclass(format('%I.%I', 'public', target_table)) is null then
      continue;
    end if;

    constraint_name := 'fk_' || target_table || '_company';
    if not exists (
      select 1
      from pg_constraint
      where conname = constraint_name
        and conrelid = to_regclass(format('%I.%I', 'public', target_table))
    ) then
      -- Company-scoped child data is removed with its company.
      execute format(
        'alter table public.%I add constraint %I foreign key (company_id) references public.companies(id) on delete cascade not valid',
        target_table,
        constraint_name
      );
      execute format(
        'alter table public.%I validate constraint %I',
        target_table,
        constraint_name
      );
    end if;
  end loop;
end
$$;

-- ---------------------------------------------------------------------------
-- 2. Splash event -> splash ad integrity (analytics preserved on deletion)
-- ---------------------------------------------------------------------------
-- Historical view/click metrics must survive ad deletion, so the FK uses
-- ON DELETE SET NULL instead of CASCADE. The column therefore becomes nullable;
-- events created by the API always carry a valid splash_ad_id at insert time.
do $$
begin
  if to_regclass('public.company_splash_ad_events') is not null
    and to_regclass('public.company_splash_ads') is not null then
    alter table public.company_splash_ad_events
      alter column splash_ad_id drop not null;
    if not exists (
      select 1
      from pg_constraint
      where conname = 'fk_company_splash_ad_events_splash_ad'
        and conrelid = to_regclass('public.company_splash_ad_events')
    ) then
      alter table public.company_splash_ad_events
        add constraint fk_company_splash_ad_events_splash_ad
        foreign key (splash_ad_id) references public.company_splash_ads(id)
        on delete set null;
    end if;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- 3. Login history browser/device columns (lossless round-trip)
-- ---------------------------------------------------------------------------
alter table public.company_login_history
  add column if not exists browser text default '';
alter table public.company_login_history
  add column if not exists device text default '';

-- ---------------------------------------------------------------------------
-- 4. Row Level Security (consistent with 001/005/020)
-- ---------------------------------------------------------------------------
alter table public.company_sms_logs enable row level security;
alter table public.company_sms_automations enable row level security;
alter table public.company_announcements enable row level security;
alter table public.company_splash_ads enable row level security;
alter table public.company_splash_ad_events enable row level security;
alter table public.company_store_policies enable row level security;
alter table public.company_legal_information enable row level security;
alter table public.company_login_history enable row level security;
alter table public.company_login_security enable row level security;
alter table public.company_ip_blocks enable row level security;

-- Server-owned writes via the privileged DATABASE_URL session (same model as
-- company_activity_logs / company_search_events).
do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'company_sms_logs','company_sms_automations','company_announcements',
    'company_splash_ads','company_splash_ad_events','company_store_policies',
    'company_legal_information','company_login_history','company_login_security','company_ip_blocks'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', 'service_insert_' || replace(target_table, 'company_', ''), target_table);
    execute format('drop policy if exists %I on public.%I', 'company_admins_select_' || replace(target_table, 'company_', ''), target_table);
  end loop;
end
$$;

create policy "service_insert_sms_logs" on company_sms_logs for insert with check (true);
create policy "service_insert_sms_automations" on company_sms_automations for insert with check (true);
create policy "service_insert_announcements" on company_announcements for insert with check (true);
create policy "service_insert_splash_ads" on company_splash_ads for insert with check (true);
create policy "service_insert_splash_ad_events" on company_splash_ad_events for insert with check (true);
create policy "service_insert_store_policies" on company_store_policies for insert with check (true);
create policy "service_insert_legal_information" on company_legal_information for insert with check (true);
create policy "service_insert_login_history" on company_login_history for insert with check (true);
create policy "service_insert_login_security" on company_login_security for insert with check (true);
create policy "service_insert_ip_blocks" on company_ip_blocks for insert with check (true);

-- Company-scoped reads gated on the authenticated tenant (defense-in-depth).
create policy "company_admins_select_sms_logs" on company_sms_logs for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_sms_automations" on company_sms_automations for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_announcements" on company_announcements for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_splash_ads" on company_splash_ads for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_splash_ad_events" on company_splash_ad_events for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_store_policies" on company_store_policies for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_legal_information" on company_legal_information for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_login_history" on company_login_history for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_login_security" on company_login_security for select
  using (company_id = current_setting('app.current_company_id', true)::text);
create policy "company_admins_select_ip_blocks" on company_ip_blocks for select
  using (company_id = current_setting('app.current_company_id', true)::text);

-- ---------------------------------------------------------------------------
-- 5. updated_at maintenance triggers (consistent with 003 company_invoices)
-- ---------------------------------------------------------------------------
-- Only tables that carry an updated_at column. The trigger auto-sets
-- updated_at = now() on every UPDATE so reload/restore preserves recency.
do $$
declare
  target_table text;
  fn_name text;
  tg_name text;
begin
  foreach target_table in array array[
    'company_sms_automations',
    'company_announcements',
    'company_splash_ads',
    'company_store_policies',
    'company_legal_information'
  ]
  loop
    if to_regclass(format('%I.%I', 'public', target_table)) is null then
      continue;
    end if;

    fn_name := format('update_%I_updated_at', target_table);
    tg_name := format('trigger_%I_updated_at', target_table);

    execute format('drop trigger if exists %I on public.%I', tg_name, target_table);
    execute format($sql$
      create or replace function public.%I()
      returns trigger as $body$
      begin
        new.updated_at = now();
        return new;
      end;
      $body$ language plpgsql;

      create trigger %I
        before update on public.%I
        for each row
        execute function public.%I();
    $sql$, fn_name, tg_name, target_table, fn_name);
  end loop;
end
$$;
