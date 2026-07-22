import { cn } from "@/lib/utils";
import type { InvoiceStatus, ProjectStatus } from "@/types/database";

const projectStyles: Record<string, string> = {
  discovery: "border-sky-200/80 bg-sky-50 text-sky-800",
  draft: "border-sky-200/80 bg-sky-50 text-sky-800",
  in_progress: "border-teal-200/80 bg-teal-50 text-teal-800",
  active: "border-teal-200/80 bg-teal-50 text-teal-800",
  review: "border-amber-200/80 bg-amber-50 text-amber-900",
  in_review: "border-amber-200/80 bg-amber-50 text-amber-900",
  completed: "border-blue-200/80 bg-blue-50 text-blue-800",
  archived: "border-zinc-200 bg-zinc-100 text-zinc-500",
};

const projectLabels: Record<string, string> = {
  discovery: "Discovery",
  draft: "Discovery",
  in_progress: "In Progress",
  active: "In Progress",
  review: "Review",
  in_review: "Review",
  completed: "Completed",
  archived: "Completed",
};

const invoiceStyles: Record<InvoiceStatus, string> = {
  pending:
    "border-amber-300/70 bg-amber-100 text-amber-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  paid: "border-emerald-300/70 bg-emerald-100 text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]",
  processing: "border-sky-300/70 bg-sky-100 text-sky-900",
  refund_pending: "border-amber-300 bg-amber-100 text-amber-900",
  canceled: "border-zinc-300 bg-zinc-100 text-zinc-700",
  partially_refunded: "border-violet-300 bg-violet-100 text-violet-900",
  refunded: "border-violet-300 bg-violet-100 text-violet-900",
  disputed: "border-red-300 bg-red-100 text-red-900",
};

const invoiceLabels: Record<InvoiceStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  refund_pending: "Refund initiated",
  paid: "Paid",
  canceled: "Canceled",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  disputed: "Disputed",
};

function labelize(value: string) {
  return value.replaceAll("_", " ");
}

export function ProjectStatusBadge({
  status,
  className,
}: {
  status: ProjectStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide",
        projectStyles[status] ?? "border-zinc-200 bg-zinc-50 text-zinc-600",
        className,
      )}
    >
      {projectLabels[status] ?? labelize(status)}
    </span>
  );
}

export function InvoiceStatusBadge({
  status,
  className,
}: {
  status: InvoiceStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase",
        invoiceStyles[status],
        className,
      )}
    >
      <span
        className={cn(
          "size-1.5 rounded-full",
          status === "paid"
            ? "bg-emerald-500"
            : status === "pending"
              ? "bg-amber-500"
              : status === "disputed"
                ? "bg-red-500"
                : "bg-current",
        )}
      />
      {invoiceLabels[status]}
    </span>
  );
}

/** Compact project chip for invoice rows (pairs visually with status badges). */
export function ProjectNamePill({
  title,
  className,
  onClick,
}: {
  title: string;
  className?: string;
  /** When set, renders a button that can drive the project filter. */
  onClick?: () => void;
}) {
  const classes = cn(
    "inline-flex max-w-[12rem] items-center truncate rounded-full border border-[color:var(--brand-primary,#2563eb)]/25 bg-[color:var(--brand-primary-soft,#2563eb14)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--brand-primary,#1d4ed8)]",
    onClick &&
      "cursor-pointer transition-colors hover:border-[color:var(--brand-primary,#2563eb)]/40 hover:bg-[color:var(--brand-primary,#2563eb)]/10",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={classes} title={title}>
        {title}
      </button>
    );
  }

  return (
    <span className={classes} title={title}>
      {title}
    </span>
  );
}
