import { Clock3, RotateCcw } from "lucide-react";

import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Invoice } from "@/types/database";

type InvoiceRefundStatusProps = {
  invoice: Pick<
    Invoice,
    | "status"
    | "currency"
    | "amount_paid"
    | "amount_refunded"
    | "refund_pending_amount"
    | "refund_requested_at"
    | "refund_completed_at"
  >;
  compact?: boolean;
};

function shortDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function InvoiceRefundStatus({
  invoice,
  compact = false,
}: InvoiceRefundStatusProps) {
  if (invoice.status === "refund_pending") {
    const requested = shortDate(invoice.refund_requested_at);
    return (
      <p
        className={cn(
          "flex items-start gap-1.5 text-amber-800",
          compact ? "text-[11px]" : "text-xs",
        )}
      >
        <Clock3 className="mt-0.5 size-3.5 shrink-0" />
        <span>
          Refund initiated
          {invoice.refund_pending_amount > 0
            ? ` · ${formatMoney(invoice.refund_pending_amount, invoice.currency)}`
            : ""}
          {requested ? ` on ${requested}` : ""}. Waiting for Stripe confirmation.
        </span>
      </p>
    );
  }

  if (
    invoice.status !== "partially_refunded" &&
    invoice.status !== "refunded"
  ) {
    return null;
  }

  const completed = shortDate(invoice.refund_completed_at);
  return (
    <p
      className={cn(
        "flex items-start gap-1.5 text-violet-700",
        compact ? "text-[11px]" : "text-xs",
      )}
    >
      <RotateCcw className="mt-0.5 size-3.5 shrink-0" />
      <span>
        {invoice.status === "refunded" ? "Refund completed" : "Partial refund completed"}
        {` · ${formatMoney(invoice.amount_refunded, invoice.currency)}`}
        {invoice.status === "partially_refunded"
          ? ` of ${formatMoney(invoice.amount_paid, invoice.currency)}`
          : ""}
        {completed ? ` on ${completed}` : ""}.
      </span>
    </p>
  );
}
