import { Download } from "lucide-react";

import { cn } from "@/lib/utils";

export function InvoicePdfLink({ invoiceId, compact = false }: { invoiceId: string; compact?: boolean }) {
  return (
    <a
      href={`/api/invoices/${invoiceId}/pdf`}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50",
        compact ? "size-8" : "h-8 px-2.5 text-xs",
      )}
      aria-label="Download invoice PDF"
      title="Download invoice PDF"
    >
      <Download className="size-3.5" />
      {compact ? null : "PDF"}
    </a>
  );
}
