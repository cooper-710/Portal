"use client";

import { useState } from "react";
import { CircleDollarSign, Loader2, Receipt } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { PaymentDueCalendar } from "@/components/dashboard/payment-due-calendar";
import { InvoiceStatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import type { InvoiceWithProject } from "@/lib/dashboard-data";
import { formatMoney, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { friendlyCheckoutError } from "@/utils/billing-errors";

type ClientInvoicesPageProps = {
  profile: Profile;
  invoices: InvoiceWithProject[];
};

export function ClientInvoicesPage({
  profile,
  invoices,
}: ClientInvoicesPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);

  const pendingInvoices = invoices.filter((invoice) => invoice.status === "pending");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const pendingTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  async function payInvoice(invoiceId: string) {
    setPayingId(invoiceId);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(friendlyCheckoutError(data.error));
        setPayingId(null);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError(friendlyCheckoutError(null));
      setPayingId(null);
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Client portal
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Invoices
        </h1>
        <p className="text-sm text-zinc-500">{displayName(profile)}</p>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <PaymentDueCalendar
        invoices={invoices}
        linkMode="invoices"
        onPayInvoice={(invoiceId) => void payInvoice(invoiceId)}
        payingId={payingId}
      />

      <section
        className={cn(
          "overflow-hidden rounded-2xl border shadow-sm",
          pendingInvoices.length > 0
            ? "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white"
            : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-white",
        )}
      >
        <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm">
                <CircleDollarSign
                  className={cn(
                    "size-3.5",
                    pendingInvoices.length > 0
                      ? "text-amber-600"
                      : "text-emerald-600",
                  )}
                />
                {pendingInvoices.length > 0 ? "Amount due" : "Billing"}
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500">
                  {pendingInvoices.length > 0
                    ? "Pay outstanding invoices"
                    : "You’re all caught up"}
                </p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight text-zinc-900">
                  {formatMoney(pendingTotal)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {pendingInvoices.length} awaiting payment
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {formatMoney(paidTotal)} paid
                </span>
              </div>
            </div>
            {pendingInvoices[0] ? (
              <Button
                size="sm"
                className="shrink-0 bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                disabled={payingId === pendingInvoices[0].id}
                onClick={() => void payInvoice(pendingInvoices[0].id)}
              >
                {payingId === pendingInvoices[0].id ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                Pay now
              </Button>
            ) : null}
          </div>
        </div>

        <div className="space-y-6 px-4 py-4 sm:px-5">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Due now
            </p>
            {pendingInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No invoices due"
                description="New invoices from your workspace will show up here with a Pay button."
              />
            ) : (
              <ul className="grid gap-2.5">
                {pendingInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex flex-col gap-3 rounded-xl border border-amber-200/70 bg-white p-3.5 shadow-sm transition-all hover:border-amber-300 hover:shadow-md sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900">
                          {formatMoney(invoice.amount, invoice.currency)}
                        </p>
                        <InvoiceStatusBadge status="pending" />
                      </div>
                      <p className="truncate text-xs text-zinc-500">
                        {invoice.project?.title ?? "Project invoice"} ·{" "}
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      className="w-full bg-amber-600 text-white shadow-sm hover:bg-amber-700 sm:w-auto"
                      disabled={payingId === invoice.id}
                      onClick={() => void payInvoice(invoice.id)}
                    >
                      {payingId === invoice.id ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : null}
                      Pay now
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Payment history
            </p>
            {paidInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No payments yet"
                description="Paid invoices will appear here."
              />
            ) : (
              <ul className="grid gap-2">
                {paidInvoices.map((invoice) => (
                  <li
                    key={invoice.id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-800">
                        {formatMoney(invoice.amount, invoice.currency)}
                      </p>
                      <p className="truncate text-xs text-zinc-500">
                        {invoice.project?.title ?? "-"} ·{" "}
                        {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <InvoiceStatusBadge status="paid" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
