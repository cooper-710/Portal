"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  ArrowUpRight,
  ChevronDown,
  CircleDollarSign,
  FolderKanban,
  Loader2,
  Plus,
  Receipt,
} from "lucide-react";

import { GettingStartedChecklist } from "@/components/dashboard/getting-started";
import { createInvoice } from "@/app/actions";
import { EmptyState } from "@/components/dashboard/empty-state";
import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { ProjectPhaseSelector } from "@/components/dashboard/project-phase-selector";
import {
  InvoiceStatusBadge,
  ProjectStatusBadge,
} from "@/components/dashboard/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { FreelancerProject, InvoiceWithProject } from "@/lib/dashboard-data";
import { formatMoney, isCompletedProject, displayName, projectClientLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

type FreelancerDashboardProps = {
  profile: Profile;
  projects: FreelancerProject[];
  invoices: InvoiceWithProject[];
};

export function FreelancerDashboard({
  profile,
  projects,
  invoices,
}: FreelancerDashboardProps) {
  const router = useRouter();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pendingInvoices = invoices.filter((invoice) => invoice.status === "pending");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const pendingTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const paidTotal = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const activeProjects = projects.filter(
    (project) => !isCompletedProject(project.status),
  );
  const completedProjects = projects.filter((project) =>
    isCompletedProject(project.status),
  );

  const previewPending = pendingInvoices.slice(0, 4);
  const previewActive = activeProjects.slice(0, 4);

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
            Overview
          </h1>
          <p className="text-sm text-zinc-500">{displayName(profile)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="border-zinc-200 bg-white shadow-sm hover:border-zinc-300 hover:bg-zinc-50"
            onClick={() => setShowInvoiceForm((value) => !value)}
          >
            <Plus className="size-4" />
            New invoice
          </Button>
          <NewProjectDialog
            onCreated={(result) => {
              setMessage(
                result?.inviteSent
                  ? "Project created and invite emailed to the client."
                  : "Project created.",
              );
              router.refresh();
            }}
          />
        </div>
      </div>

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

      <GettingStartedChecklist
        profile={profile}
        projectCount={projects.length}
        onProjectCreated={() => router.refresh()}
      />

      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <section
          className={cn(
            "flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm",
            pendingInvoices.length > 0
              ? "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white"
              : "border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50",
          )}
        >
          <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
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
              <Link
                href="/dashboard/invoices"
                className={cn(
                  buttonVariants({ size: "sm" }),
                  "shrink-0 shadow-sm",
                )}
              >
                View all
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 px-4 py-4 sm:px-5">
            {showInvoiceForm ? (
              <form
                action={onCreateInvoice}
                className="grid gap-3 rounded-xl border border-zinc-200 bg-white p-3.5 shadow-sm"
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

            {previewPending.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No pending invoices"
                description="Create an invoice when you’re ready to bill a client."
              />
            ) : (
              <ul className="grid gap-2.5">
                {previewPending.map((invoice) => (
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

            {pendingInvoices.length > previewPending.length ? (
              <Link
                href="/dashboard/invoices"
                className="text-center text-xs font-medium text-blue-700 hover:underline"
              >
                +{pendingInvoices.length - previewPending.length} more on Invoices
              </Link>
            ) : null}

            {paidInvoices.length > 0 ? (
              <div className="mt-auto border-t border-zinc-100 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Recently paid
                  </p>
                  <Link
                    href="/dashboard/invoices"
                    className="text-[11px] font-medium text-blue-700 hover:underline"
                  >
                    All invoices
                  </Link>
                </div>
                <ul className="grid gap-2">
                  {paidInvoices.slice(0, 3).map((invoice) => (
                    <li
                      key={invoice.id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-zinc-200/80 bg-zinc-50/70 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-800">
                          {formatMoney(invoice.amount, invoice.currency)}
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {invoice.project?.title ?? "-"}
                        </p>
                      </div>
                      <InvoiceStatusBadge status="paid" />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
                  <FolderKanban className="size-3.5 text-zinc-500" />
                  Projects
                </div>
                <p className="text-xs text-zinc-500">
                  {activeProjects.length} active
                  {completedProjects.length > 0
                    ? ` · ${completedProjects.length} completed`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href="/dashboard/projects"
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                    "shadow-sm",
                  )}
                >
                  View all
                  <ArrowUpRight className="size-3.5" />
                </Link>
                <NewProjectDialog onCreated={() => router.refresh()} />
              </div>
            </div>
          </div>

          <div className="flex flex-1 flex-col px-4 py-4 sm:px-5">
            {projects.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                className="border-0 bg-transparent py-6"
                title="No projects yet"
                description="Create a project and invite a client by email."
                action={<NewProjectDialog onCreated={() => router.refresh()} />}
              />
            ) : previewActive.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                className="border-0 bg-transparent py-6"
                title="No active projects"
                description="Completed work lives on the Projects page."
                action={
                  <Link
                    href="/dashboard/projects"
                    className={buttonVariants({ size: "sm", variant: "outline" })}
                  >
                    Browse projects
                  </Link>
                }
              />
            ) : (
              <>
                <ul className="grid gap-2.5">
                  {previewActive.map((project) => {
                    const clientLabel = projectClientLabel(
                      project.client,
                      project.client_email,
                    );

                    return (
                      <li
                        key={project.id}
                        className="rounded-xl border border-zinc-200/80 bg-zinc-50/40 p-3.5 transition-all hover:border-blue-200 hover:bg-white hover:shadow-sm"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            router.push(`/dashboard/projects/${project.id}`)
                          }
                          className="group w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/30"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-semibold text-zinc-900 transition-colors group-hover:text-blue-700">
                                  {project.title}
                                </p>
                                <ProjectStatusBadge status={project.status} />
                              </div>
                              <p className="mt-1 truncate text-xs text-zinc-500">
                                {clientLabel}
                              </p>
                            </div>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-500 transition-colors group-hover:border-blue-200 group-hover:bg-blue-50 group-hover:text-blue-700">
                              Open
                              <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </span>
                          </div>
                        </button>
                        <div className="mt-3 border-t border-zinc-200/70 pt-3">
                          <ProjectPhaseSelector
                            projectId={project.id}
                            status={project.status}
                            compact
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {activeProjects.length > previewActive.length ? (
                  <Link
                    href="/dashboard/projects"
                    className="mt-3 text-center text-xs font-medium text-blue-700 hover:underline"
                  >
                    +{activeProjects.length - previewActive.length} more on Projects
                  </Link>
                ) : null}

                {completedProjects.length > 0 ? (
                  <div className="mt-4 border-t border-zinc-100 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowCompleted((value) => !value)}
                      className="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1.5 text-left transition-colors hover:bg-zinc-50"
                      aria-expanded={showCompleted}
                    >
                      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                        Completed projects
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-zinc-400">
                        {completedProjects.length}
                        <ChevronDown
                          className={cn(
                            "size-3.5 transition-transform",
                            showCompleted && "rotate-180",
                          )}
                          aria-hidden
                        />
                      </span>
                    </button>
                    {showCompleted ? (
                      <ul className="mt-2 grid gap-2">
                        {completedProjects.slice(0, 3).map((project) => {
                          const clientLabel = projectClientLabel(
                            project.client,
                            project.client_email,
                          );

                          return (
                            <li key={project.id}>
                              <button
                                type="button"
                                onClick={() =>
                                  router.push(`/dashboard/projects/${project.id}`)
                                }
                                className="group flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200/60 bg-zinc-50/30 px-3 py-2.5 text-left transition-all hover:border-zinc-300 hover:bg-white"
                              >
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="truncate text-sm font-medium text-zinc-700 transition-colors group-hover:text-zinc-900">
                                      {project.title}
                                    </p>
                                    <ProjectStatusBadge status={project.status} />
                                  </div>
                                  <p className="mt-0.5 truncate text-xs text-zinc-400">
                                    {clientLabel}
                                  </p>
                                </div>
                                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-zinc-400 transition-colors group-hover:text-blue-700">
                                  Open
                                  <ArrowUpRight className="size-3" />
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
