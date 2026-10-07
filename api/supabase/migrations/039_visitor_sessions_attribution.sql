-- Campaign/post attribution for storefront visitor sessions.
-- Adds one JSONB column holding the first-touch UTM parameters and referrer
-- hostname captured when a visitor enters the storefront. No PII is stored.
-- Additive only; existing rows keep '{}' until new sessions arrive.
-- NOT executed by the application; apply on staging after a backup.
-- Production application requires separate explicit approval.

begin;

alter table public.company_visitor_sessions
  add column if not exists attribution jsonb not null default '{}'::jsonb;

commit;
