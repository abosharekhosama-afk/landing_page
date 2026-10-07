-- Migration 003: Company Invoices
-- Creates company_invoices table for per-company invoice storage.

create table if not exists public.company_invoices (
  id text primary key,
  company_id text not null default 'eb-chemical' references public.companies(id) on delete cascade,
  invoice_number text not null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  order_id text,
  status text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'cancelled', 'void')),
  currency text not null default 'ILS',
  issue_date date not null default current_date,
  due_date date,
  notes text,
  line_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  discount_total numeric(12,2) not null default 0,
  tax_total numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_by text not null,
  updated_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,

  constraint unique_company_invoice_number unique (company_id, invoice_number)
);

-- Index for per-company listing
create index if not exists idx_company_invoices_company_id on public.company_invoices(company_id);

-- Index for invoice number lookups per company
create index if not exists idx_company_invoices_number on public.company_invoices(company_id, invoice_number);

-- Enable RLS
alter table public.company_invoices enable row level security;

-- Company-scoped policy requires explicit session variable; API-level tenant filtering is authoritative.
create policy "Company invoices are scoped to company_id"
  on public.company_invoices
  for all
  using (company_id = current_setting('app.current_company_id', true));

-- Default company sequence for invoice numbers
create sequence if not exists public.company_invoice_seq
  start with 1
  increment 1
  no maxvalue
  no cycle;

-- Trigger to auto-set updated_at
create or replace function public.update_company_invoices_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trigger_company_invoices_updated_at
  before update on public.company_invoices
  for each row
  execute function public.update_company_invoices_updated_at();
