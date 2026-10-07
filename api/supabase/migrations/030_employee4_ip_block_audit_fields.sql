-- Employee 4 Task 11: audit creator for manual and automatic IP blocks.
alter table public.company_ip_blocks
  add column if not exists created_by text;
