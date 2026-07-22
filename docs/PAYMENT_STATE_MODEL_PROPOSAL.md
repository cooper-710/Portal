# Minimum invoice payment-state proposal

> Historical design note: the lifecycle is now implemented by the forward
> migrations `20260722204807_invoice_payment_lifecycle.sql` and
> `20260722211959_direct_charge_account_ownership.sql`. The migrations and
> current TypeScript types are authoritative where this early proposal differs.

## Minimal invoice fields

Expand `invoice_status` from `pending | paid` to:

- `pending` — collectible, no successful payment;
- `processing` — asynchronous payment submitted but not final;
- `paid` — full amount succeeded;
- `payment_failed` — latest attempt failed; invoice can be retried;
- `canceled` — invoice intentionally voided before settlement;
- `partially_refunded` — some settled funds returned;
- `refunded` — all settled funds returned;
- `disputed` — an open dispute affects the payment.

Add system-managed invoice aggregates:

- `amount_paid` integer default `0`;
- `amount_refunded` integer default `0`;
- `payment_status_updated_at timestamptz`;
- `stripe_charge_id text` (nullable, indexed/unique where non-null);
- `active_dispute_id text` (nullable; do not assume only webhook payload storage is sufficient).

`status`, all Stripe IDs, amounts paid/refunded, and status timestamps must be writable only by the service role/payment reconciliation path.

## Minimal immutable event table

Add `invoice_payment_events` with:

- `id uuid`, `invoice_id uuid`, `stripe_event_id text unique`;
- `event_type` constrained to payment succeeded/failed/canceled, refund created/updated, dispute opened/closed;
- `stripe_object_id`, `amount`, `currency`, `outcome`, `occurred_at`, `recorded_at`;
- a small sanitized `metadata jsonb` for reconciliation identifiers only.

Enable RLS. Owners and assigned clients may read events for their project; no authenticated user may insert/update/delete. Service role writes only. Keep raw Stripe payloads out of this table unless a separately secured retention policy is approved.

## Transition rules

- Derive current invoice status from verified, idempotent webhook/reconciliation events, not browser return URLs.
- A failed attempt does not erase a prior successful payment.
- Refund aggregates are monotonic per refund lifecycle and support multiple partial refunds.
- An open dispute overlays the paid/refund state; closing a won dispute restores the derived settlement state, while a lost dispute records the financial loss without deleting history.
- Cancellation is valid only before successful settlement; refunds are not cancellation.
- Duplicate and out-of-order Stripe events must converge to the same state.

Before implementation, map the exact Stripe event/object set after the direct-vs-destination charge decision because refund, transfer reversal, dispute, and connected-account webhook behavior differs.
