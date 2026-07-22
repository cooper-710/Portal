"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  CircleDollarSign,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";

import { createInvoice } from "@/app/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { StripeConnectBanner } from "@/components/dashboard/stripe-connect-banner";
import {
  InvoiceStatusBadge,
} from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FreelancerProject, InvoiceWithProject } from "@/lib/dashboard-data";
import { formatMoney, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

type FreelancerInvoicesPageProps = {
  profile: Profile;
  projects: FreelancerProject[];
  invoices: InvoiceWithProject[];
  connectStatus?: string | null;
};

export function FreelancerInvoicesPage({
  profile,
  projects,
  invoices,
  connectStatus = null,
}: FreelancerInvoicesPageProps) {
  const router = useRouter();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingInvoices = invoices.filter((invoice) => invoice.status === "pending");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const pendingTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

  function onCreateInvoice(formData: FormData) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createInvoice(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setMessage("Invoice created.");
      setShowInvoiceForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Workspace
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Invoices
          </h1>
          <p className="text-sm text-zinc-500">{displayName(profile)}</p>
        </div>
        <Button
          className="shadow-sm"
          onClick={() => setShowInvoiceForm((value) => !value)}
        >
          <Plus className="size-4" />
          New invoice
        </Button>
      </div>

      <StripeConnectBanner
        chargesEnabled={profile.stripe_charges_enabled}
        detailsSubmitted={profile.stripe_details_submitted}
        hasAccount={Boolean(profile.stripe_account_id)}
        connectStatus={connectStatus}
      />

      {message ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-900">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <section
        className={cn(
          "overflow-hidden rounded-2xl border shadow-sm",
          pendingInvoices.length > 0
            ? "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white"
            : "border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50",
        )}
      >
        <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm">
                <CircleDollarSign className="size-3.5 text-amber-600" />
                Billing
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500">
                  {pendingInvoices.length > 0
                    ? "Outstanding balance"
                    : "All invoices settled"}
                </p>
                <p className="mt-0.5 text-3xl font-semibold tracking-tight text-zinc-900">
                  {formatMoney(pendingTotal)}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  {pendingInvoices.length} pending
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-100/80 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-900">
                  <span className="size-1.5 rounded-full bg-emerald-500" />
                  {formatMoney(paidTotal)} paid
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 px-4 py-4 sm:px-5">
          {showInvoiceForm ? (
            <form
              action={onCreateInvoice}
              className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm sm:max-w-md"
            >
              <div className="space-y-2">
                <Label htmlFor="projectId">Project</Label>
                <select
                  id="projectId"
                  name="projectId"
                  required
                  className="h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm shadow-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (USD)</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  required
                  placeholder="1500"
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="submit" size="sm" disabled={pending}>
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Create
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowInvoiceForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          ) : null}

          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Pending
            </p>
            {pendingInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No pending invoices"
                description="Create an invoice when you’re ready to bill a client."
              />
            ) : (
              <ul className="grid gap-2.5">
                {pendingInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/projects/${invoice.project_id}`)
                      }
                      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white p-3.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-sm font-semibold text-zinc-900">
                            {formatMoney(invoice.amount, invoice.currency)}
                          </p>
                          <InvoiceStatusBadge status="pending" />
                        </div>
                        <p className="truncate text-xs text-zinc-500">
                          {invoice.project?.title ?? "Untitled project"} ·{" "}
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <ArrowUpRight className="size-4 shrink-0 text-amber-700 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-3 border-t border-zinc-100 pt-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Paid
            </p>
            {paidInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No paid invoices yet"
                description="Settled invoices will appear here."
              />
            ) : (
              <ul className="grid gap-2">
                {paidInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <button
                      type="button"
                      onClick={() =>
                        router.push(`/dashboard/projects/${invoice.project_id}`)
                      }
                      className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-3 text-left transition-all hover:border-zinc-300 hover:bg-white"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800">
                          {formatMoney(invoice.amount, invoice.currency)}
                        </p>
                        <p className="truncate text-xs text-zinc-500">
                          {invoice.project?.title ?? "—"} ·{" "}
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <InvoiceStatusBadge status="paid" />
                    </button>
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
