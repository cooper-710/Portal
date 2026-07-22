-- Test-mode direct charges create payment objects on a connected account.
-- Persist that account boundary so every webhook and reconciliation operation
-- can prove it is reading/writing the correct merchant's objects.

alter table public.invoices
  add column if not exists stripe_connected_account_id text;

alter table public.invoice_payment_events
  add column if not exists stripe_connected_account_id text;

alter table public.stripe_webhook_events
  add column if not exists stripe_connected_account_id text;

create index if not exists invoices_connected_account_idx
  on public.invoices (stripe_connected_account_id)
  where stripe_connected_account_id is not null;

create index if not exists invoice_payment_events_connected_account_idx
  on public.invoice_payment_events (stripe_connected_account_id, occurred_at desc)
  where stripe_connected_account_id is not null;

-- The account boundary is payment-system state, never user-authored state.
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
