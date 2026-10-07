-- Website editor drafts scoped by site.
-- Migration 016 (company_site_editor_drafts) was already applied to staging
-- and is intentionally left untouched. A single company may host multiple
-- connected websites, so draft uniqueness and lookups must include site_id.
--
-- This migration is additive relative to 016 and has NOT been applied
-- anywhere yet. Do not run until the storefront manifest + multi-site
-- connector flow has been validated in staging.

begin;

alter table public.company_site_editor_drafts
  drop constraint if exists company_site_editor_drafts_company_id_page_id_locale_key;

alter table public.company_site_editor_drafts
  add constraint company_site_editor_drafts_site_scope_key
    unique (company_id, site_id, page_id, locale);

drop index if exists idx_company_site_editor_drafts_lookup;

create index if not exists idx_company_site_editor_drafts_site_lookup
  on public.company_site_editor_drafts (company_id, site_id, page_id, locale);

commit;
