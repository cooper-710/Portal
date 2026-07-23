import { formatMoney } from "@/lib/format";
import {
  type ClientAction,
  type Invoice,
  type PaymentKind,
} from "@/types/database";

export type ClientActionWithLinks = ClientAction & {
  project?: { title: string } | null;
  invoice?: {
    amount: number;
    currency: string;
    status: string;
    due_date: string | null;
    payment_kind: PaymentKind;
  } | null;
  asset?: {
    file_name: string | null;
    review_status: string | null;
  } | null;
};

type InvoiceForNextAction = Pick<
  Invoice,
  | "id"
  | "project_id"
  | "amount"
  | "currency"
  | "status"
  | "due_date"
  | "payment_kind"
  | "title"
  | "created_at"
  | "updated_at"
> & {
  project?: { title: string } | null;
};

function invoiceFallbackAction(
  invoice: InvoiceForNextAction,
): ClientActionWithLinks {
  const label = invoice.title?.trim() || "Invoice";
  return {
    id: `invoice-fallback:${invoice.id}`,
    project_id: invoice.project_id,
    client_id: "",
    freelancer_id: "",
    action_type: "pay_invoice",
    status: "open",
    title: `Pay ${label} · ${formatMoney(invoice.amount, invoice.currency)}`,
    description: invoice.project?.title
      ? `Payment due for ${invoice.project.title}`
      : "An invoice is awaiting payment.",
    invoice_id: invoice.id,
    asset_id: null,
    due_at: invoice.due_date
      ? `${invoice.due_date}T12:00:00.000Z`
      : null,
    completed_at: null,
    metadata: { source: "outstanding_invoice" },
    created_at: invoice.created_at,
    updated_at: invoice.updated_at,
    project: invoice.project ?? null,
    invoice: {
      amount: invoice.amount,
      currency: invoice.currency,
      status: invoice.status,
      due_date: invoice.due_date,
      payment_kind: invoice.payment_kind,
    },
    asset: null,
  };
}

/** Priority: overdue/due payments > deliverable reviews > project reviews > rest */
export function pickNextRequiredAction(
  actions: ClientActionWithLinks[],
  invoices: InvoiceForNextAction[] = [],
): ClientActionWithLinks | null {
  const open = actions.filter((action) => action.status === "open");
  const openInvoiceIds = new Set(
    open
      .filter((action) => action.action_type === "pay_invoice")
      .map((action) => action.invoice_id)
      .filter((invoiceId): invoiceId is string => Boolean(invoiceId)),
  );
  const invoiceFallbacks = invoices
    .filter(
      (invoice) =>
        invoice.status === "pending" &&
        !openInvoiceIds.has(invoice.id),
    )
    .map(invoiceFallbackAction);
  const candidates = [...open, ...invoiceFallbacks];
  if (candidates.length === 0) return null;

  const rank = (action: ClientActionWithLinks) => {
    if (action.action_type === "pay_invoice") {
      const due = action.due_at ? new Date(action.due_at).getTime() : Infinity;
      return 0 + Math.min(due / 1e15, 0.9);
    }
    if (action.action_type === "review_deliverable") return 2;
    if (action.action_type === "review_project") return 3;
    return 4;
  };

  return candidates.sort((a, b) => rank(a) - rank(b))[0] ?? null;
}
