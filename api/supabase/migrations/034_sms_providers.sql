-- Employee 5: Dynamic SMS Providers
-- Stores configurable SMS provider settings per company

create table if not exists company_sms_providers (
  id uuid primary key default gen_random_uuid(),
  company_id text not null,
  name text not null,
  provider_type text not null default 'dynamic_http' check (provider_type in ('dynamic_http', 'twilio', 'mock')),
  is_active boolean not null default false,
  priority integer not null default 1,

  -- Connection settings
  base_url text not null,
  http_method text not null default 'POST' check (http_method in ('GET', 'POST', 'PUT')),
  content_type text not null default 'json',

  -- Authentication & Secrets (encrypted)
  auth_type text not null default 'api_key' check (auth_type in ('api_key', 'basic', 'bearer', 'none')),
  headers jsonb not null default '{}',
  encrypted_secrets jsonb not null default '{}',

  -- Request payload structure (JSON template for building the request)
  payload_structure jsonb not null default '{}',

  -- Response mapping (how to parse success/error)
  response_mapping jsonb not null default '{"successPath": "success", "messageIdPath": "message_id", "errorPath": "error"}',

  -- Provider capabilities
  capabilities jsonb not null default '{"supportsBalance": false, "supportsDeliveryReport": false, "supportsUnicode": true, "maxMessageLength": 160}',

  -- Palestinian-specific settings
  phone_normalization jsonb not null default '{"countryCode": "970", "stripPrefixes": ["0", "+"], "validateLength": 9}',

  -- Preset reference (optional)
  preset_name text,

  -- Metadata
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for fast lookups
create index if not exists idx_sms_providers_company on company_sms_providers(company_id);
create index if not exists idx_sms_providers_active on company_sms_providers(company_id, is_active);
create index if not exists idx_sms_providers_priority on company_sms_providers(company_id, priority);

-- Database invariant: at most one active provider per company, independent of priority.
create unique index if not exists idx_sms_providers_single_active
  on company_sms_providers(company_id)
  where is_active = true;

-- Row Level Security
alter table public.company_sms_providers enable row level security;

-- RLS Policies (consistent with existing company_* tables)
drop policy if exists "Users can view their company''s SMS providers" on public.company_sms_providers;
create policy "Users can view their company''s SMS providers"
  on public.company_sms_providers for select
  using (company_id = current_setting('app.current_company_id', true));

drop policy if exists "Users can insert their company''s SMS providers" on public.company_sms_providers;
create policy "Users can insert their company''s SMS providers"
  on public.company_sms_providers for insert
  with check (company_id = current_setting('app.current_company_id', true));

drop policy if exists "Users can update their company''s SMS providers" on public.company_sms_providers;
create policy "Users can update their company''s SMS providers"
  on public.company_sms_providers for update
  using (company_id = current_setting('app.current_company_id', true));

drop policy if exists "Users can delete their company''s SMS providers" on public.company_sms_providers;
create policy "Users can delete their company''s SMS providers"
  on public.company_sms_providers for delete
  using (company_id = current_setting('app.current_company_id', true));

-- Trigger to update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

drop trigger if exists update_company_sms_providers_updated_at on company_sms_providers;
create trigger update_company_sms_providers_updated_at
  before update on company_sms_providers
  for each row
  execute function update_updated_at_column();



-- Enforce exactly one active SMS provider per company, independent of priority.
-- Existing duplicate active rows are normalized deterministically before the index.
with ranked as (
  select id, row_number() over (partition by company_id order by created_at asc, id asc) as rn
  from public.company_sms_providers
  where is_active = true
)
update public.company_sms_providers p
set is_active = false, updated_at = now()
from ranked r
where p.id = r.id and r.rn > 1;
