import type { Invoice } from "@/types/database";

export function refundableInvoiceAmount(
  invoice: Pick<Invoice, "amount_paid" | "amount_refunded">,
) {
  return Math.max(0, invoice.amount_paid - invoice.amount_refunded);
}

export function canRequestInvoiceRefund(
  invoice: Pick<Invoice, "status" | "amount_paid" | "amount_refunded" | "stripe_charge_id" | "stripe_connected_account_id">,
) {
  return (
    (invoice.status === "paid" || invoice.status === "partially_refunded") &&
    refundableInvoiceAmount(invoice) > 0 &&
    Boolean(invoice.stripe_charge_id) &&
    Boolean(invoice.stripe_connected_account_id)
  );
}

export function validateInvoiceRefundAmount(
  requestedAmount: unknown,
  refundableAmount: number,
) {
  if (
    typeof requestedAmount !== "number" ||
    !Number.isSafeInteger(requestedAmount) ||
    requestedAmount <= 0
  ) {
    return { ok: false as const, error: "Enter a valid refund amount." };
  }
  if (requestedAmount > refundableAmount) {
    return {
      ok: false as const,
      error: "The refund cannot exceed the remaining paid amount.",
    };
  }
  return { ok: true as const, amount: requestedAmount };
}

export function invoiceRefundIdempotencyKey(args: {
  invoiceId: string;
  connectedAccountId: string;
  chargeId: string;
  amountRefunded: number;
  requestedAmount: number;
}) {
  return [
    "portal:invoice-refund",
    args.connectedAccountId,
    args.invoiceId,
    args.chargeId,
    args.amountRefunded,
    args.requestedAmount,
  ].join(":");
}
