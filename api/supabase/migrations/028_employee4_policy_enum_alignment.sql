-- Employee 4 Task 08: align policy type enum with the public product contract.
-- Existing REFUND rows are preserved; new API/UI writes use REFUNDS.
do $$
begin
  if to_regclass('public.company_store_policies') is not null then
    alter table public.company_store_policies
      drop constraint if exists company_store_policies_type_check;
    alter table public.company_store_policies
      add constraint company_store_policies_type_check
      check (type in ('SHIPPING','RETURNS','REFUNDS','REFUND','EXCHANGE','CANCELLATION','PRIVACY','TERMS','WARRANTY','CUSTOM'));
  end if;
end
$$;
