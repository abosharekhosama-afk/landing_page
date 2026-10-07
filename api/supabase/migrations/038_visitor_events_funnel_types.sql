-- Funnel tracking: widen the stored storefront visitor event types.
-- Existing: pageview, product_view, heartbeat.
-- Added:    add_to_cart, remove_from_cart, initiate_checkout, purchase.
-- NOT executed by the application; apply on staging after a backup.
-- Production application requires separate explicit approval.

begin;

do $$
declare
  constraint_row record;
begin
  -- Discover the existing event_type CHECK by definition instead of guessing
  -- its auto-generated name.
  for constraint_row in
    select con.conname
    from pg_constraint con
    where con.conrelid = 'public.company_visitor_events'::regclass
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%event_type%'
  loop
    execute format('alter table public.company_visitor_events drop constraint %I', constraint_row.conname);
  end loop;
end $$;

alter table public.company_visitor_events
  add constraint company_visitor_events_event_type_check
  check (event_type in (
    'pageview',
    'product_view',
    'heartbeat',
    'add_to_cart',
    'remove_from_cart',
    'initiate_checkout',
    'purchase'
  ));

commit;
