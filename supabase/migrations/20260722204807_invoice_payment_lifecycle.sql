-- Forward-only invoice payment lifecycle. This migration intentionally builds on
-- the adopted production baseline and does not rewrite any earlier migration.

alter type public.invoice_status add value if not exists 'processing';
alter type public.invoice_status add value if not exists 'canceled';
alter type public.invoice_status add value if not exists 'partially_refunded';
alter type public.invoice_status add value if not exists 'refunded';
alter type public.invoice_status add value if not exists 'disputed';

alter table public.invoices
  add column if not exists amount_paid integer not null default 0 check (amount_paid >= 0),
  add column if not exists amount_refunded integer not null default 0 check (amount_refunded >= 0),
  add column if not exists stripe_charge_id text,
  add column if not exists stripe_dispute_id text,
  add column if not exists dispute_status text check (dispute_status in ('open', 'won', 'lost')),
  add column if not exists payment_status_updated_at timestamptz,
  add column if not exists last_payment_event_created_at bigint;

-- Preserve the financial meaning of invoices already marked paid before this
-- lifecycle data existed.
update public.invoices
set amount_paid = amount,
    payment_status_updated_at = coalesce(payment_status_updated_at, updated_at)
where status = 'paid'
  and amount_paid = 0;

create unique index if not exists invoices_stripe_charge_id_uidx
  on public.invoices (stripe_charge_id)
  where stripe_charge_id is not null;

create table if not exists public.invoice_payment_events (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  stripe_event_id text not null unique,
  event_type text not null,
  stripe_object_id text,
  outcome text not null,
  invoice_status public.invoice_status,
  amount_paid integer check (amount_paid is null or amount_paid >= 0),
  amount_refunded integer check (amount_refunded is null or amount_refunded >= 0),
  stripe_charge_id text,
  stripe_dispute_id text,
  failure_code text,
  failure_message text,
  occurred_at timestamptz not null,
  recorded_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists invoice_payment_events_invoice_occurred_idx
  on public.invoice_payment_events (invoice_id, occurred_at desc);

alter table public.invoice_payment_events enable row level security;

revoke all on table public.invoice_payment_events from anon, authenticated;
grant select on table public.invoice_payment_events to authenticated;
grant all on table public.invoice_payment_events to service_role;

create policy "Project members can view invoice payment events"
  on public.invoice_payment_events
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.invoices i
      where i.id = invoice_payment_events.invoice_id
        and public.is_project_member(i.project_id)
    )
  );

-- Reassert explicit column grants so all lifecycle fields remain server-owned.
revoke update on table public.invoices from authenticated;
grant update (amount, due_date, title) on table public.invoices to authenticated;

drop policy if exists "Freelancers can create invoices" on public.invoices;
create policy "Freelancers can create invoices"
  on public.invoices
  for insert
  to authenticated
  with check (
    status = 'pending'
    and stripe_payment_intent_id is null
    and stripe_checkout_session_id is null
    and amount_paid = 0
    and amount_refunded = 0
    and stripe_charge_id is null
    and stripe_dispute_id is null
    and dispute_status is null
    and payment_status_updated_at is null
    and last_payment_event_created_at is null
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );
