-- Employee 4 Task 09: persist the resolved authority logo URL alongside its media ID.
-- The URL is a storage reference, not a second storage mechanism.
alter table public.company_legal_information
  add column if not exists authority_logo_url text;
