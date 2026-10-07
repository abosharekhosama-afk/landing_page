-- Tenant-scoped, unpublished website editor drafts.
-- This migration is additive and does not alter published storefront content.

begin;

create table if not exists public.company_site_editor_drafts (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  site_id text not null,
  page_id text not null,
  locale text not null,
  document jsonb not null,
  status text not null default 'draft',
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by text references public.users(id) on delete set null,
  updated_by text references public.users(id) on delete set null,
  updated_by_email text,
  constraint company_site_editor_drafts_site_required check (btrim(site_id) <> ''),
  constraint company_site_editor_drafts_page_required check (btrim(page_id) <> ''),
  constraint company_site_editor_drafts_locale_required check (btrim(locale) <> ''),
  constraint company_site_editor_drafts_document_object check (jsonb_typeof(document) = 'object'),
  constraint company_site_editor_drafts_status_check check (status = 'draft'),
  constraint company_site_editor_drafts_revision_check check (revision >= 0),
  unique (company_id, page_id, locale)
);

create index if not exists idx_company_site_editor_drafts_lookup
  on public.company_site_editor_drafts (company_id, page_id, locale);

commit;
