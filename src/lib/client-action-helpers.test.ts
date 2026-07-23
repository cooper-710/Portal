import { describe, expect, it } from "vitest";

import {
  pickNextRequiredAction,
  type ClientActionWithLinks,
} from "@/lib/client-action-helpers";
import type { Invoice } from "@/types/database";

function invoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: "invoice-1",
    project_id: "project-1",
    amount: 2500,
    currency: "usd",
    status: "pending",
    payment_kind: "standard",
    title: "Recurring 1/5",
    due_date: "2026-07-23",
    installment_number: null,
    parent_invoice_id: null,
    series_key: null,
    recurrence_frequency: null,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    stripe_connected_account_id: null,
    amount_paid: 0,
    amount_refunded: 0,
    refund_pending_amount: 0,
    stripe_charge_id: null,
    stripe_refund_id: null,
    stripe_dispute_id: null,
    dispute_status: null,
    refund_requested_at: null,
    refund_completed_at: null,
    payment_status_updated_at: null,
    last_payment_event_created_at: null,
    created_at: "2026-07-20T12:00:00.000Z",
    updated_at: "2026-07-20T12:00:00.000Z",
    ...overrides,
  };
}

function reviewAction(): ClientActionWithLinks {
  return {
    id: "review-1",
    project_id: "project-1",
    client_id: "client-1",
    freelancer_id: "owner-1",
    action_type: "review_deliverable",
    status: "open",
    title: "Review deliverable",
    description: null,
    invoice_id: null,
    asset_id: "asset-1",
    due_at: null,
    completed_at: null,
    metadata: {},
    created_at: "2026-07-20T12:00:00.000Z",
    updated_at: "2026-07-20T12:00:00.000Z",
  };
}

describe("client next required action", () => {
  it("uses an outstanding invoice when its client action is missing", () => {
    expect(pickNextRequiredAction([], [invoice()])).toMatchObject({
      action_type: "pay_invoice",
      invoice_id: "invoice-1",
      title: "Pay Recurring 1/5 · $25.00",
    });
  });

  it("prioritizes an outstanding invoice over a review action", () => {
    expect(
      pickNextRequiredAction([reviewAction()], [invoice()])?.action_type,
    ).toBe("pay_invoice");
  });

  it("does not create actions for settled invoices", () => {
    expect(
      pickNextRequiredAction([], [
        invoice({ status: "paid", amount_paid: 2500 }),
      ]),
    ).toBeNull();
  });

  it("does not ask the client to repay canceled or processing invoices", () => {
    expect(
      pickNextRequiredAction([], [
        invoice({ status: "canceled" }),
        invoice({ id: "invoice-2", status: "processing" }),
      ]),
    ).toBeNull();
  });
});
