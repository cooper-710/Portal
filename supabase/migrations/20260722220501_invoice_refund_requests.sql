-- Portal-initiated refunds are requested synchronously, then completed by a
-- connected-account Stripe webhook. Keep the short-lived requested state
-- separate from cumulative completed refund totals.

alter type public.invoice_status add value if not exists 'refund_pending';

alter table public.invoices
  add column if not exists refund_pending_amount integer not null default 0
    check (refund_pending_amount >= 0),
  add column if not exists stripe_refund_id text,
  add column if not exists refund_requested_at timestamptz,
  add column if not exists refund_completed_at timestamptz;

create unique index if not exists invoices_stripe_refund_id_uidx
  on public.invoices (stripe_refund_id)
  where stripe_refund_id is not null;

-- Refund state is written only by authenticated server routes and verified
-- Stripe webhooks through the service role.
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
    and stripe_connected_account_id is null
    and amount_paid = 0
    and amount_refunded = 0
    and refund_pending_amount = 0
    and stripe_charge_id is null
    and stripe_refund_id is null
    and stripe_dispute_id is null
    and dispute_status is null
    and refund_requested_at is null
    and refund_completed_at is null
    and payment_status_updated_at is null
    and last_payment_event_created_at is null
    and exists (
      select 1 from public.projects p
      where p.id = project_id
        and p.freelancer_id = (select auth.uid())
    )
  );
