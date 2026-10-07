-- Employee 4 Task 04: durable duplicate-event protection for lifecycle SMS.
-- One lifecycle event may fan out to multiple recipients, so recipient is part
-- of the uniqueness key. This is a database backstop; the service also keeps a
-- process-local in-flight guard for concurrent requests.
create unique index if not exists uq_sms_automation_event_recipient
  on public.company_sms_logs(company_id, related_entity_type, related_entity_id, recipient)
  where related_entity_type = 'SMS_AUTOMATION_EVENT'
    and related_entity_id is not null
    and related_entity_id <> ''
    and status in ('SENT','DELIVERED');
