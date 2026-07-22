"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  CircleDollarSign,
  Receipt,
} from "lucide-react";

import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
} from "@/components/dashboard/dashboard-card";
import { CreateInvoiceDialog } from "@/components/dashboard/create-invoice-dialog";
import { EmptyState } from "@/components/dashboard/empty-state";
import { InvoiceOwnerActions } from "@/components/dashboard/invoice-owner-actions";
import { InvoicePdfLink } from "@/components/dashboard/invoice-pdf-link";
import { PaymentDueCalendar } from "@/components/dashboard/payment-due-calendar";
import {
  ProjectFilter,
  softReplaceProjectQuery,
} from "@/components/dashboard/project-filter";
import { StripeConnectBanner } from "@/components/dashboard/stripe-connect-banner";
import {
  InvoiceStatusBadge,
  ProjectNamePill,
} from "@/components/dashboard/status-badge";
import type {
  FreelancerProject,
  InvoiceWithProject,
} from "@/lib/client-home-scope";
import { formatMoney, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isInvoiceOutstanding, isInvoiceSettled, type Profile } from "@/types/database";

type FreelancerInvoicesPageProps = {
  profile: Profile;
  projects: FreelancerProject[];
  invoices: InvoiceWithProject[];
  connectStatus?: string | null;
  selectedProjectId?: string | null;
};

export function FreelancerInvoicesPage({
  profile,
  projects,
  invoices,
  connectStatus = null,
  selectedProjectId = null,
}: FreelancerInvoicesPageProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [filterProjectId, setFilterProjectId] = useState(selectedProjectId);

  useEffect(() => {
    setFilterProjectId(selectedProjectId);
  }, [selectedProjectId]);

  const visibleInvoices = filterProjectId
    ? invoices.filter((invoice) => invoice.project_id === filterProjectId)
    : invoices;

  const pendingInvoices = visibleInvoices.filter(
    (invoice) => isInvoiceOutstanding(invoice.status),
  );
  const paidInvoices = visibleInvoices.filter(
    (invoice) => isInvoiceSettled(invoice.status),
  );
  const pendingTotal = pendingInvoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const paidTotal = paidInvoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );

  function selectProject(projectId: string) {
    softReplaceProjectQuery("/dashboard/invoices", projectId);
    setFilterProjectId(projectId);
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
        <div className="flex flex-col items-stretch gap-3 sm:items-end">
          {projects.length > 0 ? (
            <ProjectFilter
              projects={projects.map((project) => ({
                id: project.id,
                title: project.title,
              }))}
              value={filterProjectId}
              onChange={setFilterProjectId}
              basePath="/dashboard/invoices"
            />
          ) : null}
          <CreateInvoiceDialog
            projects={projects.map((project) => ({
              id: project.id,
              title: project.title,
            }))}
            triggerClassName="shadow-sm"
            onCreated={setMessage}
          />
        </div>
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

      <PaymentDueCalendar invoices={visibleInvoices} linkMode="project" />

      <DashboardCard
        fillHeight={false}
        className={cn(
          pendingInvoices.length > 0
            ? "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white"
            : "border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50",
          "max-h-[40rem]",
        )}
      >
        <DashboardCardHeader className="bg-inherit">
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
        </DashboardCardHeader>

        <DashboardCardBody className="space-y-6">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              Pending
            </p>
            {pendingInvoices.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No pending invoices"
                description={
                  filterProjectId
                    ? "No pending invoices for this project."
                    : "Create an invoice when you’re ready to bill a client."
                }
              />
            ) : (
              <ul className="grid gap-2.5">
                {pendingInvoices.map((invoice) => {
                  const projectTitle =
                    invoice.project?.title ?? "Untitled project";
                  return (
                    <li
                      key={invoice.id}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/70 bg-white p-3.5 text-left shadow-sm"
                    >
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/projects/${invoice.project_id}`,
                              )
                            }
                            className="truncate text-sm font-semibold text-zinc-900 hover:underline"
                          >
                            {formatMoney(invoice.amount, invoice.currency)}
                          </button>
                          <InvoiceStatusBadge status="pending" />
                          <ProjectNamePill
                            title={projectTitle}
                            onClick={() => selectProject(invoice.project_id)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/projects/${invoice.project_id}`,
                            )
                          }
                          className="block w-full truncate text-left text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          {invoice.title?.trim()
                            ? `${invoice.title.trim()} · `
                            : ""}
                          {new Date(invoice.created_at).toLocaleDateString()}
                          {invoice.due_date
                            ? ` · due ${new Date(`${invoice.due_date}T12:00:00`).toLocaleDateString()}`
                            : ""}
                        </button>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <InvoicePdfLink invoiceId={invoice.id} compact />
                        <InvoiceOwnerActions
                          invoice={invoice}
                          projectTitle={projectTitle}
                          onMessage={setMessage}
                          compact
                        />
                        <ArrowUpRight className="size-4 shrink-0 text-amber-700" />
                      </div>
                    </li>
                  );
                })}
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
                description={
                  filterProjectId
                    ? "No paid invoices for this project."
                    : "Settled invoices will appear here."
                }
              />
            ) : (
              <ul className="grid gap-2">
                {paidInvoices.map((invoice) => {
                  const projectTitle = invoice.project?.title ?? "-";
                  return (
                    <li
                      key={invoice.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200/80 bg-zinc-50/70 px-3.5 py-3 transition-all hover:border-zinc-300 hover:bg-white"
                    >
                      <div className="min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              router.push(
                                `/dashboard/projects/${invoice.project_id}`,
                              )
                            }
                            className="truncate text-sm font-medium text-zinc-800 hover:underline"
                          >
                            {formatMoney(invoice.amount, invoice.currency)}
                          </button>
                          <ProjectNamePill
                            title={projectTitle}
                            onClick={() => selectProject(invoice.project_id)}
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/dashboard/projects/${invoice.project_id}`,
                            )
                          }
                          className="block truncate text-left text-xs text-zinc-500 hover:text-zinc-700"
                        >
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </button>
                      </div>
                      <InvoiceStatusBadge status="paid" />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </DashboardCardBody>
      </DashboardCard>
    </div>
  );
}
