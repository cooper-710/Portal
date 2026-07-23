-- Client Autopilot notification foundation.
-- Forward-only: durable domain-event outbox, in-app notifications, delivery
-- attempts, user preferences, and browser-push subscriptions.

create schema if not exists private;

create table public.notification_events (
  id uuid primary key default gen_random_uuid(),
  event_key text not null unique,
  event_type text not null,
  recipient_id uuid references public.users(id) on delete cascade,
  recipient_email text,
  actor_id uuid references public.users(id) on delete set null,
  freelancer_id uuid references public.users(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  invoice_id uuid references public.invoices(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  available_at timestamptz not null default now(),
  processed_at timestamptz,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_events_recipient_check check (
    recipient_id is not null or nullif(trim(recipient_email), '') is not null
  )
);

create index notification_events_pending_idx
  on public.notification_events (available_at, created_at)
  where processed_at is null;
create index notification_events_recipient_idx
  on public.notification_events (recipient_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  notification_type text not null,
  title text not null,
  body text not null,
  href text not null default '/dashboard',
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index notifications_user_unread_idx
  on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.notification_events(id) on delete cascade,
  notification_id uuid references public.notifications(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  recipient_email text,
  channel text not null check (channel in ('email', 'push')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'retry', 'delivered', 'failed', 'skipped')),
  dedupe_key text not null unique,
  scheduled_for timestamptz not null default now(),
  next_attempt_at timestamptz not null default now(),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  max_attempts integer not null default 5 check (max_attempts between 1 and 10),
  locked_at timestamptz,
  delivered_at timestamptz,
  provider_id text,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_deliveries_recipient_check check (
    user_id is not null or nullif(trim(recipient_email), '') is not null
  )
);

create index notification_deliveries_due_idx
  on public.notification_deliveries (next_attempt_at, created_at)
  where status in ('pending', 'retry');

create table public.notification_preferences (
  user_id uuid primary key references public.users(id) on delete cascade,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default true,
  push_enabled boolean not null default false,
  quiet_hours_enabled boolean not null default false,
  quiet_hours_start time not null default '22:00',
  quiet_hours_end time not null default '08:00',
  timezone text not null default 'UTC',
  invites_enabled boolean not null default true,
  reviews_enabled boolean not null default true,
  invoices_enabled boolean not null default true,
  payments_enabled boolean not null default true,
  projects_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create trigger notification_events_set_updated_at
  before update on public.notification_events
  for each row execute function public.set_updated_at();
create trigger notification_deliveries_set_updated_at
  before update on public.notification_deliveries
  for each row execute function public.set_updated_at();
create trigger notification_preferences_set_updated_at
  before update on public.notification_preferences
  for each row execute function public.set_updated_at();
create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

alter table public.notification_events enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;

-- Domain events and channel deliveries are an internal outbox. The service
-- role processes them; signed-in users have no direct Data API access.
revoke all on table public.notification_events from anon, authenticated;
revoke all on table public.notification_deliveries from anon, authenticated;
grant all on table public.notification_events to service_role;
grant all on table public.notification_deliveries to service_role;
grant all on table public.notifications to service_role;
grant all on table public.notification_preferences to service_role;
grant all on table public.push_subscriptions to service_role;

grant select on table public.notifications to authenticated;
grant update (read_at) on table public.notifications to authenticated;
grant select, insert, update, delete on table public.notification_preferences to authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

create policy notifications_select_own
  on public.notifications for select to authenticated
  using (user_id = auth.uid());

create policy notifications_mark_own_read
  on public.notifications for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy notification_preferences_select_own
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());
create policy notification_preferences_insert_own
  on public.notification_preferences for insert to authenticated
  with check (user_id = auth.uid());
create policy notification_preferences_update_own
  on public.notification_preferences for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy notification_preferences_delete_own
  on public.notification_preferences for delete to authenticated
  using (user_id = auth.uid());

create policy push_subscriptions_select_own
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy push_subscriptions_insert_own
  on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
create policy push_subscriptions_update_own
  on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy push_subscriptions_delete_own
  on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

create or replace function private.enqueue_notification_event(
  p_event_key text,
  p_event_type text,
  p_recipient_id uuid,
  p_recipient_email text,
  p_actor_id uuid,
  p_freelancer_id uuid,
  p_project_id uuid,
  p_invoice_id uuid,
  p_asset_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_available_at timestamptz default now()
) returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_recipient_id is null and nullif(trim(p_recipient_email), '') is null then
    return;
  end if;

  insert into public.notification_events (
    event_key, event_type, recipient_id, recipient_email, actor_id,
    freelancer_id, project_id, invoice_id, asset_id, payload, available_at
  ) values (
    p_event_key, p_event_type, p_recipient_id, lower(nullif(trim(p_recipient_email), '')),
    p_actor_id, p_freelancer_id, p_project_id, p_invoice_id, p_asset_id,
    coalesce(p_payload, '{}'::jsonb), coalesce(p_available_at, now())
  ) on conflict (event_key) do nothing;
end;
$$;

revoke all on function private.enqueue_notification_event(
  text, text, uuid, text, uuid, uuid, uuid, uuid, uuid, jsonb, timestamptz
) from public, anon, authenticated;

create or replace function private.capture_project_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite_changed boolean;
begin
  if tg_op = 'INSERT' then
    v_invite_changed := true;
  else
    v_invite_changed := new.client_email is distinct from old.client_email
      or new.client_id is distinct from old.client_id;
  end if;

  if v_invite_changed and new.client_email is not null then
    if new.client_id is not null then
      perform private.enqueue_notification_event(
        'project:' || new.id || ':invite-user:' || new.client_id,
        'client_invited', new.client_id, null, new.freelancer_id,
        new.freelancer_id, new.id, null, null,
        jsonb_build_object('project_title', new.title), now()
      );
    else
      perform private.enqueue_notification_event(
        'project:' || new.id || ':invite-reminder:' || md5(lower(new.client_email)),
        'client_invite_reminder', null, new.client_email, new.freelancer_id,
        new.freelancer_id, new.id, null, null,
        jsonb_build_object('project_title', new.title), now() + interval '24 hours'
      );
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if new.status::text = 'completed' and new.status is distinct from old.status then
      perform private.enqueue_notification_event(
        'project:' || new.id || ':closed:owner', 'project_closed',
        new.freelancer_id, null, new.client_id, new.freelancer_id,
        new.id, null, null, jsonb_build_object('project_title', new.title), now()
      );
      perform private.enqueue_notification_event(
        'project:' || new.id || ':closed:client', 'project_closed',
        new.client_id, null, new.freelancer_id, new.freelancer_id,
        new.id, null, null, jsonb_build_object('project_title', new.title), now()
      );
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.capture_client_action_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type text;
begin
  if tg_op = 'INSERT' and new.status::text = 'open' then
    v_type := case new.action_type::text
      when 'pay_invoice' then 'invoice_created'
      when 'review_deliverable' then 'deliverable_review_requested'
      when 'review_project' then 'final_approval_requested'
      else null
    end;
    if v_type is not null then
      perform private.enqueue_notification_event(
        'client-action:' || new.id, v_type, new.client_id, null,
        new.freelancer_id, new.freelancer_id, new.project_id,
        new.invoice_id, new.asset_id,
        jsonb_build_object('title', new.title, 'description', new.description), now()
      );
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.status::text = 'open'
       and new.status::text = 'completed'
       and new.action_type::text = 'review_project' then
      v_type := case new.metadata ->> 'decision'
        when 'approved' then 'final_approval_received'
        when 'changes_requested' then 'project_changes_requested'
        else null
      end;
      if v_type is not null then
        perform private.enqueue_notification_event(
          'client-action:' || new.id || ':' || v_type, v_type,
          new.freelancer_id, null, new.client_id, new.freelancer_id,
          new.project_id, new.invoice_id, new.asset_id,
          jsonb_build_object('note', new.metadata ->> 'review_note'), now()
        );
      end if;
    end if;
  end if;

  return new;
end;
$$;

create or replace function private.capture_asset_review_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_type text;
begin
  if new.review_status is not distinct from old.review_status then
    return new;
  end if;

  v_type := case new.review_status::text
    when 'approved' then 'deliverable_approved'
    when 'changes_requested' then 'deliverable_changes_requested'
    else null
  end;
  if v_type is null then return new; end if;

  select * into v_project from public.projects where id = new.project_id;
  perform private.enqueue_notification_event(
    'asset:' || new.id || ':' || v_type || ':' || coalesce(new.reviewed_at::text, now()::text),
    v_type, v_project.freelancer_id, null, v_project.client_id,
    v_project.freelancer_id, new.project_id, null, new.id,
    jsonb_build_object('file_name', new.file_name, 'note', new.review_note), now()
  );
  return new;
end;
$$;

create or replace function private.capture_invoice_notifications()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_project public.projects%rowtype;
  v_type text;
  v_key_suffix text;
  v_payload jsonb;
  v_outcome text;
begin
  if new.last_payment_event_created_at is distinct from old.last_payment_event_created_at then
    select outcome into v_outcome
    from public.invoice_payment_events
    where invoice_id = new.id
    order by recorded_at desc
    limit 1;
  end if;

  if new.status is not distinct from old.status
     and new.amount_refunded is not distinct from old.amount_refunded
     and coalesce(v_outcome, '') not in ('failed', 'canceled', 'refund_failed') then
    return new;
  end if;

  select * into v_project from public.projects where id = new.project_id;
  v_type := case
    when v_outcome in ('failed', 'canceled') then 'payment_failed'
    when v_outcome = 'refund_failed' then 'refund_failed'
    when old.status::text = 'refund_pending'
      and new.status::text in ('paid', 'partially_refunded')
      and new.refund_requested_at is null then 'refund_failed'
    else case new.status::text
      when 'paid' then 'payment_succeeded'
      when 'canceled' then 'payment_failed'
      when 'refund_pending' then 'refund_initiated'
      when 'partially_refunded' then 'refund_completed'
      when 'refunded' then 'refund_completed'
      when 'disputed' then 'payment_disputed'
      else null
    end
  end;
  if v_type is null then return new; end if;

  v_key_suffix := case
    when v_type = 'refund_completed' then ':' || new.amount_refunded::text
    when v_type in ('payment_failed', 'refund_failed')
      then ':' || coalesce(new.last_payment_event_created_at::text, new.payment_status_updated_at::text, now()::text)
    else ''
  end;
  v_payload := jsonb_build_object(
    'amount', new.amount,
    'currency', new.currency,
    'amount_paid', new.amount_paid,
    'amount_refunded', new.amount_refunded,
    'title', new.title,
    'status', new.status::text
  );

  perform private.enqueue_notification_event(
    'invoice:' || new.id || ':' || v_type || v_key_suffix || ':owner',
    v_type, v_project.freelancer_id, null, v_project.client_id,
    v_project.freelancer_id, new.project_id, new.id, null, v_payload, now()
  );
  perform private.enqueue_notification_event(
    'invoice:' || new.id || ':' || v_type || v_key_suffix || ':client',
    v_type, v_project.client_id, v_project.client_email, v_project.freelancer_id,
    v_project.freelancer_id, new.project_id, new.id, null, v_payload, now()
  );

  return new;
end;
$$;

revoke all on function private.capture_project_notifications() from public, anon, authenticated;
revoke all on function private.capture_client_action_notifications() from public, anon, authenticated;
revoke all on function private.capture_asset_review_notifications() from public, anon, authenticated;
revoke all on function private.capture_invoice_notifications() from public, anon, authenticated;

create trigger projects_capture_notifications
  after insert or update of client_email, client_id, status on public.projects
  for each row execute function private.capture_project_notifications();
create trigger client_actions_capture_notifications
  after insert or update of status, metadata on public.client_actions
  for each row execute function private.capture_client_action_notifications();
create trigger assets_capture_review_notifications
  after update of review_status, review_note, reviewed_at on public.assets
  for each row execute function private.capture_asset_review_notifications();
create trigger invoices_capture_notifications
  after update of status, amount_refunded, last_payment_event_created_at on public.invoices
  for each row execute function private.capture_invoice_notifications();

comment on table public.notification_events is
  'Durable, idempotent domain-event outbox for Client Autopilot.';
comment on table public.notification_deliveries is
  'Retryable email and browser-push delivery attempts derived from notification events.';
