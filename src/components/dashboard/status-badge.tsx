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
          status === "pending" ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      {status === "pending" ? "Pending" : "Paid"}
    </span>
  );
}
