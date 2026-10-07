-- Canonical tenant-scoped Inbox foundation. Additive only; no hard-delete workflow.

begin;

create table if not exists public.company_inbox_conversations (
  id uuid primary key,
  company_id text not null references public.companies(id) on delete restrict,
  contact_user_id text not null,
  subject text not null default '',
  channel text not null default 'internal' check (channel = 'internal'),
  status text not null default 'open' check (status in ('open', 'closed')),
  assigned_user_id text,
  created_by_user_id text not null,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz,
  archived_at timestamptz,
  unique (company_id, id),
  foreign key (company_id, contact_user_id)
    references public.company_memberships(company_id, user_id) on delete restrict,
  foreign key (company_id, assigned_user_id)
    references public.company_memberships(company_id, user_id) on delete restrict,
  foreign key (created_by_user_id)
    references public.users(id) on delete restrict
);

create table if not exists public.company_inbox_messages (
  id uuid primary key,
  company_id text not null references public.companies(id) on delete restrict,
  conversation_id uuid not null,
  sender_type text not null check (sender_type in ('customer', 'staff', 'system')),
  sender_user_id text,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, conversation_id)
    references public.company_inbox_conversations(company_id, id) on delete restrict,
  foreign key (sender_user_id)
    references public.users(id) on delete restrict
);

create table if not exists public.company_inbox_reads (
  company_id text not null references public.companies(id) on delete restrict,
  conversation_id uuid not null,
  user_id text not null,
  last_read_at timestamptz not null default now(),
  primary key (company_id, conversation_id, user_id),
  foreign key (company_id, conversation_id)
    references public.company_inbox_conversations(company_id, id) on delete restrict,
  foreign key (user_id)
    references public.users(id) on delete restrict
);

-- Scoped Super Admin sessions intentionally have no company_memberships row.
-- This trigger permits those global identities while requiring every other
-- actor/sender/reader to have an active membership in the row's company.
create or replace function public.enforce_company_inbox_actor_scope()
returns trigger
language plpgsql
as $$
declare
  scoped_user_id text;
begin
  scoped_user_id := case tg_table_name
    when 'company_inbox_conversations' then new.created_by_user_id
    when 'company_inbox_messages' then new.sender_user_id
    when 'company_inbox_reads' then new.user_id
  end;
  if scoped_user_id is null and tg_table_name = 'company_inbox_messages'
     and to_jsonb(new)->>'sender_type' = 'system' then
    return new;
  end if;
  if exists (
    select 1 from public.users u
    where u.id = scoped_user_id and u.role = 'super_admin' and u.is_active = true
  ) or exists (
    select 1 from public.company_memberships cm
    where cm.company_id = new.company_id
      and cm.user_id = scoped_user_id
      and cm.is_active = true
  ) then
    return new;
  end if;
  raise exception 'Inbox actor is outside the company scope' using errcode = '23514';
end;
$$;

drop trigger if exists trg_company_inbox_conversation_actor_scope
  on public.company_inbox_conversations;
create trigger trg_company_inbox_conversation_actor_scope
before insert or update of company_id, created_by_user_id
on public.company_inbox_conversations
for each row execute function public.enforce_company_inbox_actor_scope();

drop trigger if exists trg_company_inbox_message_actor_scope
  on public.company_inbox_messages;
create trigger trg_company_inbox_message_actor_scope
before insert or update of company_id, sender_type, sender_user_id
on public.company_inbox_messages
for each row execute function public.enforce_company_inbox_actor_scope();

drop trigger if exists trg_company_inbox_read_actor_scope
  on public.company_inbox_reads;
create trigger trg_company_inbox_read_actor_scope
before insert or update of company_id, user_id
on public.company_inbox_reads
for each row execute function public.enforce_company_inbox_actor_scope();

create index if not exists idx_company_inbox_conversations_activity
  on public.company_inbox_conversations
  (company_id, last_message_at desc nulls last, updated_at desc, id desc);
create index if not exists idx_company_inbox_conversations_contact
  on public.company_inbox_conversations (company_id, contact_user_id, updated_at desc);
create index if not exists idx_company_inbox_conversations_assignee_status
  on public.company_inbox_conversations (company_id, assigned_user_id, status, updated_at desc);
create index if not exists idx_company_inbox_conversations_archived
  on public.company_inbox_conversations (company_id, archived_at, updated_at desc);
create index if not exists idx_company_inbox_messages_conversation_time
  on public.company_inbox_messages (company_id, conversation_id, created_at, id);
create index if not exists idx_company_inbox_reads_user_time
  on public.company_inbox_reads (company_id, user_id, last_read_at desc);

commit;
