import { describe, expect, it } from "vitest";

import type { Invoice } from "@/types/database";
import {
  canRequestInvoiceRefund,
  invoiceRefundIdempotencyKey,
  refundableInvoiceAmount,
  validateInvoiceRefundAmount,
} from "@/utils/stripe/invoice-refund";

const paidInvoice = {
  status: "paid",
  amount_paid: 10_000,
  amount_refunded: 0,
  stripe_charge_id: "ch_owner_a",
  stripe_connected_account_id: "acct_owner_a",
} satisfies Pick<
  Invoice,
  | "status"
  | "amount_paid"
  | "amount_refunded"
  | "stripe_charge_id"
  | "stripe_connected_account_id"
>;

describe("owner invoice refunds", () => {
  it("allows only completed, account-bound charges to be refunded", () => {
    expect(canRequestInvoiceRefund(paidInvoice)).toBe(true);
    expect(canRequestInvoiceRefund({ ...paidInvoice, status: "refund_pending" })).toBe(false);
    expect(canRequestInvoiceRefund({ ...paidInvoice, stripe_charge_id: null })).toBe(false);
    expect(canRequestInvoiceRefund({ ...paidInvoice, stripe_connected_account_id: null })).toBe(false);
  });

  it("calculates and validates partial and remaining refund amounts", () => {
    expect(refundableInvoiceAmount({ amount_paid: 10_000, amount_refunded: 2_500 })).toBe(7_500);
    expect(validateInvoiceRefundAmount(2_500, 7_500)).toEqual({ ok: true, amount: 2_500 });
    expect(validateInvoiceRefundAmount(7_501, 7_500).ok).toBe(false);
    expect(validateInvoiceRefundAmount(1.5, 7_500).ok).toBe(false);
  });

  it("uses stable, account-scoped idempotency keys", () => {
    const args = {
      invoiceId: "inv_a",
      connectedAccountId: "acct_a",
      chargeId: "ch_a",
      amountRefunded: 0,
      requestedAmount: 2_500,
    };
    const key = invoiceRefundIdempotencyKey(args);
    expect(invoiceRefundIdempotencyKey({ ...args })).toBe(key);
    expect(invoiceRefundIdempotencyKey({ ...args, connectedAccountId: "acct_b" })).not.toBe(key);
    expect(invoiceRefundIdempotencyKey({ ...args, amountRefunded: 2_500 })).not.toBe(key);
  });
});
