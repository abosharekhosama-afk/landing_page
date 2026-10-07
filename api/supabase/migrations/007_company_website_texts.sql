-- Migration 007: company-scoped website text overrides and hidden default media keys
begin;

create table if not exists public.company_website_texts (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  text_key text not null,
  group_key text not null default 'general',
  label text not null default '',
  value_json jsonb not null default '{"ar":"","en":"","he":""}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.company_website_texts
  add column if not exists deleted_at timestamptz;

create unique index if not exists idx_company_website_texts_company_key
  on public.company_website_texts (company_id, text_key);

create table if not exists public.company_website_media_hidden_keys (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  section_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_company_website_media_hidden_key
  on public.company_website_media_hidden_keys (company_id, section_key);

alter table public.company_website_texts enable row level security;
alter table public.company_website_media_hidden_keys enable row level security;

commit;
