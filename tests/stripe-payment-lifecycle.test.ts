import { describe, expect, it } from "vitest";

import type { Invoice } from "@/types/database";
import {
  invoiceCheckoutIdempotencyKey,
  type NormalizedInvoicePaymentEvent,
  reduceInvoicePaymentState,
} from "@/utils/stripe/invoice-payment-lifecycle";

const invoice: Invoice = {
  id: "11111111-1111-1111-1111-111111111111",
  project_id: "22222222-2222-2222-2222-222222222222",
  amount: 10_000,
  currency: "usd",
  status: "pending",
  payment_kind: "standard",
  due_date: null,
  installment_number: null,
  parent_invoice_id: null,
  title: "Launch invoice",
  series_key: null,
  recurrence_frequency: null,
  stripe_payment_intent_id: null,
  stripe_checkout_session_id: null,
  amount_paid: 0,
  amount_refunded: 0,
  stripe_charge_id: null,
  stripe_dispute_id: null,
  dispute_status: null,
  payment_status_updated_at: null,
  last_payment_event_created_at: null,
  created_at: "2026-07-22T12:00:00.000Z",
  updated_at: "2026-07-22T12:00:00.000Z",
};

function fixture(
  outcome: NormalizedInvoicePaymentEvent["outcome"],
  overrides: Partial<NormalizedInvoicePaymentEvent> = {},
): NormalizedInvoicePaymentEvent {
  return {
    stripeEventId: `evt_${outcome}`,
    stripeEventType: `fixture.${outcome}`,
    stripeObjectId: "pi_fixture",
    invoiceId: invoice.id,
    outcome,
    occurredAt: 1_753_200_000,
    ...overrides,
  };
}

describe("Stripe invoice payment lifecycle fixtures", () => {
  it("records processing and async success with provider identifiers", () => {
    const processing = reduceInvoicePaymentState(invoice, fixture("processing"));
    expect(processing.status).toBe("processing");

    const paid = reduceInvoicePaymentState(
      processing,
      fixture("succeeded", {
        occurredAt: 1_753_200_010,
        amountPaid: 10_000,
        chargeId: "ch_fixture",
        paymentIntentId: "pi_fixture",
        checkoutSessionId: "cs_fixture",
      }),
    );
    expect(paid).toMatchObject({
      status: "paid",
      amount_paid: 10_000,
      stripe_charge_id: "ch_fixture",
      stripe_payment_intent_id: "pi_fixture",
      stripe_checkout_session_id: "cs_fixture",
    });
  });

  it("returns async failures to pending and expired sessions to canceled", () => {
    expect(reduceInvoicePaymentState(invoice, fixture("failed")).status).toBe("pending");
    expect(reduceInvoicePaymentState(invoice, fixture("canceled")).status).toBe("canceled");
  });

  it("tracks partial and full refunds", () => {
    const paid = reduceInvoicePaymentState(
      invoice,
      fixture("succeeded", { amountPaid: 10_000 }),
    );
    const partial = reduceInvoicePaymentState(
      paid,
      fixture("partially_refunded", {
        occurredAt: 1_753_200_010,
        amountRefunded: 2_500,
      }),
    );
    expect(partial).toMatchObject({ status: "partially_refunded", amount_refunded: 2_500 });
    const full = reduceInvoicePaymentState(
      partial,
      fixture("refunded", { occurredAt: 1_753_200_020, amountRefunded: 10_000 }),
    );
    expect(full).toMatchObject({ status: "refunded", amount_refunded: 10_000 });
  });

  it("tracks disputes opened, won, and lost", () => {
    const paid = reduceInvoicePaymentState(
      invoice,
      fixture("succeeded", { amountPaid: 10_000 }),
    );
    const opened = reduceInvoicePaymentState(
      paid,
      fixture("dispute_opened", { occurredAt: 1_753_200_010, disputeId: "dp_fixture" }),
    );
    expect(opened).toMatchObject({ status: "disputed", dispute_status: "open" });
    expect(
      reduceInvoicePaymentState(
        opened,
        fixture("dispute_won", { occurredAt: 1_753_200_020 }),
      ),
    ).toMatchObject({ status: "paid", dispute_status: "won" });
    expect(
      reduceInvoicePaymentState(
        opened,
        fixture("dispute_lost", { occurredAt: 1_753_200_020 }),
      ),
    ).toMatchObject({ status: "disputed", dispute_status: "lost" });
  });

  it("does not let an older event overwrite newer financial state", () => {
    const refunded = reduceInvoicePaymentState(
      { ...invoice, amount_paid: 10_000 },
      fixture("refunded", { occurredAt: 200, amountRefunded: 10_000 }),
    );
    const staleSuccess = reduceInvoicePaymentState(
      refunded,
      fixture("succeeded", { occurredAt: 100, amountPaid: 10_000 }),
    );
    expect(staleSuccess).toMatchObject({
      status: "refunded",
      amount_refunded: 10_000,
      last_payment_event_created_at: 200,
    });
  });

  it("uses one stable key for concurrent Checkout requests and a new key after persistence", () => {
    const first = invoiceCheckoutIdempotencyKey(invoice);
    expect(invoiceCheckoutIdempotencyKey({ ...invoice })).toBe(first);
    expect(
      invoiceCheckoutIdempotencyKey({ ...invoice, updated_at: "2026-07-22T12:01:00.000Z" }),
    ).not.toBe(first);
  });

  it("models duplicate Stripe delivery as a single applied fixture", () => {
    const seen = new Set<string>();
    let state = invoice;
    const event = fixture("succeeded", { amountPaid: 10_000 });
    for (const delivery of [event, event]) {
      if (seen.has(delivery.stripeEventId)) continue;
      seen.add(delivery.stripeEventId);
      state = { ...state, ...reduceInvoicePaymentState(state, delivery) };
    }
    expect(seen.size).toBe(1);
    expect(state.status).toBe("paid");
  });
});
