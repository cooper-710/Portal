"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ChevronDown,
  CircleDollarSign,
  FolderKanban,
  Loader2,
  Receipt,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { FileVault } from "@/components/dashboard/file-vault";
import {
  InvoiceStatusBadge,
  ProjectStatusBadge,
} from "@/components/dashboard/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import type { ClientProject, InvoiceWithProject } from "@/lib/dashboard-data";
import { formatMoney, isCompletedProject, displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Asset, Profile, ProjectStatus } from "@/types/database";
import { createClient } from "@/utils/supabase/client";

type ClientDashboardProps = {
  profile: Profile;
  projects: ClientProject[];
  selectedProjectId: string | null;
  assets: Asset[];
  invoices: InvoiceWithProject[];
};

export function ClientDashboard({
  profile,
  projects: initialProjects,
  selectedProjectId,
  assets,
  invoices,
}: ClientDashboardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(initialProjects);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [phaseLive, setPhaseLive] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  const projectIdsKey = initialProjects
    .map((project) => project.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!projectIdsKey) return;

    const projectIds = projectIdsKey.split(",");
    const supabase = createClient();

    const channel = supabase
      .channel("client-project-phases")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "projects",
        },
        (payload) => {
          const next = payload.new as { id?: string; status?: ProjectStatus };
          if (!next.id || !next.status || !projectIds.includes(next.id)) {
            return;
          }

          setProjects((current) =>
            current.map((project) =>
              project.id === next.id
                ? { ...project, status: next.status as ProjectStatus }
                : project,
            ),
          );
          setPhaseLive(true);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectIdsKey, router]);

  const activeProjects = projects.filter(
    (item) => !isCompletedProject(item.status),
  );
  const completedProjects = projects.filter((item) =>
    isCompletedProject(item.status),
  );

  const selectedFromQuery = selectedProjectId
    ? (projects.find((item) => item.id === selectedProjectId) ?? null)
    : null;
  const project =
    selectedFromQuery ??
    activeProjects[0] ??
    completedProjects[0] ??
    null;
  const viewingCompleted = project ? isCompletedProject(project.status) : false;

  useEffect(() => {
    if (viewingCompleted) {
      setShowCompleted(true);
    }
  }, [viewingCompleted]);

  const pendingInvoices = invoices.filter((invoice) => invoice.status === "pending");
  const paidInvoices = invoices.filter((invoice) => invoice.status === "paid");
  const pendingTotal = pendingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
  const previewPending = pendingInvoices.slice(0, 4);
  const previewActive = activeProjects.slice(0, 4);

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
        setError(data.error ?? "Unable to start checkout.");
        setPayingId(null);
        return;
      }

      window.location.assign(data.url);
    } catch {
      setError("Unable to start checkout.");
      setPayingId(null);
    }
  }

  if (projects.length === 0 || !project) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Client portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Overview
          </h1>
          <p className="text-sm text-zinc-500">{displayName(profile)}</p>
        </div>
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="When you are invited to a project, it will show up here so you can share files and pay invoices."
        />
        <section className="max-w-md rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-zinc-900">Your profile</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Update your name and password in Settings.
          </p>
          <div className="mt-4">
            <Link
              href="/dashboard/settings"
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "shadow-sm",
              )}
            >
              Edit in Settings
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
            Client portal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Overview
          </h1>
          <p className="text-sm text-zinc-500">
            Signed in as {displayName(profile)}
          </p>
        </div>
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
            <span className="size-1.5 rounded-full bg-blue-500" aria-hidden />
            Viewing
          </span>
          <p className="max-w-[16rem] truncate text-sm font-semibold text-zinc-900">
            {project.title}
          </p>
          <p className="text-xs text-zinc-500">
            {projects.length} project{projects.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-2 lg:gap-6">
        <section
          className={cn(
            "overflow-hidden rounded-2xl border shadow-sm",
            pendingInvoices.length > 0
              ? "border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-white"
              : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/80 via-white to-white",
          )}
        >
          <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
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
                  <InvoiceStatusBadge
                    status={pendingInvoices.length > 0 ? "pending" : "paid"}
                  />
                  <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-0.5 text-[11px] font-medium text-zinc-600">
                    {pendingInvoices.length} awaiting payment
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {pendingInvoices[0] ? (
                  <Button
                    size="sm"
                    className="bg-amber-600 text-white shadow-sm hover:bg-amber-700"
                    disabled={payingId === pendingInvoices[0].id}
                    onClick={() => void payInvoice(pendingInvoices[0].id)}
                  >
                    {payingId === pendingInvoices[0].id ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Pay now
                  </Button>
                ) : null}
                <Link
                  href="/dashboard/invoices"
                  className="text-[11px] font-medium text-blue-700 hover:underline"
                >
                  All invoices
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            {previewPending.length === 0 ? (
              <EmptyState
                icon={Receipt}
                className="border-0 bg-transparent py-6"
                title="No invoices due"
                description="New invoices from your workspace will show up here with a Pay button."
              />
            ) : (
              <ul className="grid gap-2.5">
                {previewPending.map((invoice) => (
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

            {pendingInvoices.length > previewPending.length ? (
              <Link
                href="/dashboard/invoices"
                className="block text-center text-xs font-medium text-blue-700 hover:underline"
              >
                +{pendingInvoices.length - previewPending.length} more on Invoices
              </Link>
            ) : null}

            {paidInvoices.length > 0 ? (
              <div className="border-t border-zinc-100 pt-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                    Payment history
                  </p>
                  <Link
                    href="/dashboard/invoices"
                    className="text-[11px] font-medium text-blue-700 hover:underline"
                  >
                    View all
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

        <section className="overflow-hidden rounded-2xl border border-blue-200/70 bg-gradient-to-br from-blue-50/50 via-white to-white shadow-sm ring-1 ring-blue-100/80">
          <div className="border-b border-blue-100/80 bg-blue-50/40 px-4 py-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center gap-2 rounded-full border border-blue-200/80 bg-white px-2.5 py-1 text-xs font-medium text-blue-800 shadow-sm">
                    <FolderKanban className="size-3.5 text-blue-600" />
                    Projects
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100/80 px-2 py-0.5 text-[11px] font-semibold text-blue-900">
                    Viewing
                  </span>
                </div>
                <p className="truncate text-sm font-semibold text-zinc-900">
                  {project.title}
                </p>
                <p className="truncate text-xs text-zinc-500">
                  With {displayName(project.freelancer, "your freelancer")}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <ProjectStatusBadge status={project.status} />
                <span
                  className={cn(
                    "text-[11px] font-medium",
                    phaseLive ? "text-emerald-700" : "text-zinc-400",
                  )}
                >
                  {phaseLive ? "Live" : "Realtime"}
                </span>
                <Link
                  href="/dashboard/projects"
                  className={cn(
                    buttonVariants({ size: "sm", variant: "outline" }),
                    "mt-1 shadow-sm",
                  )}
                >
                  View all
                  <ArrowUpRight className="size-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="space-y-3 px-4 py-4 sm:px-5">
            {previewActive.length === 0 ? (
              <EmptyState
                icon={FolderKanban}
                className="border-0 bg-transparent py-6"
                title="No active projects"
                description={
                  completedProjects.length > 0
                    ? "Your completed work is in the section below."
                    : "When you are invited, projects will show up here."
                }
              />
            ) : (
              <>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
                  Switch project
                </p>
                <ul className="grid gap-2">
                  {previewActive.map((item) => {
                    const active = item.id === project.id;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-current={active ? "true" : undefined}
                          onClick={() =>
                            router.push(`/dashboard?project=${item.id}`, {
                              scroll: false,
                            })
                          }
                          className={cn(
                            "flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-3 text-left transition-all",
                            active
                              ? "border-blue-400 bg-blue-50 shadow-md ring-2 ring-blue-200/80"
                              : "border-zinc-200/80 bg-zinc-50/40 hover:border-zinc-300 hover:bg-white hover:shadow-sm",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className={cn(
                                  "truncate text-sm font-semibold",
                                  active ? "text-blue-950" : "text-zinc-900",
                                )}
                              >
                                {item.title}
                              </p>
                              {active ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-900">
                                  <Check className="size-2.5" aria-hidden />
                                  Viewing
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">
                              {displayName(item.freelancer, "Workspace")}
                            </p>
                          </div>
                          <ProjectStatusBadge status={item.status} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {activeProjects.length > previewActive.length ? (
                  <Link
                    href="/dashboard/projects"
                    className="block text-center text-xs font-medium text-blue-700 hover:underline"
                  >
                    +{activeProjects.length - previewActive.length} more on Projects
                  </Link>
                ) : null}
              </>
            )}

            {completedProjects.length > 0 ? (
              <div className="border-t border-zinc-100 pt-3">
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
                    {completedProjects.slice(0, 3).map((item) => {
                      const active = item.id === project.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            aria-current={active ? "true" : undefined}
                            onClick={() =>
                              router.push(`/dashboard?project=${item.id}`, {
                                scroll: false,
                              })
                            }
                            className={cn(
                              "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-all",
                              active
                                ? "border-blue-300 bg-blue-50/80 shadow-sm ring-1 ring-blue-200/70"
                                : "border-zinc-200/60 bg-zinc-50/30 hover:border-zinc-300 hover:bg-white",
                            )}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p
                                  className={cn(
                                    "truncate text-sm font-medium",
                                    active ? "text-blue-950" : "text-zinc-700",
                                  )}
                                >
                                  {item.title}
                                </p>
                                {active ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-900">
                                    <Check className="size-2.5" aria-hidden />
                                    Viewing
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 truncate text-xs text-zinc-400">
                                {displayName(item.freelancer, "Workspace")}
                              </p>
                            </div>
                            <ProjectStatusBadge status={item.status} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full border border-blue-200/80 bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-800">
              <span className="size-1.5 rounded-full bg-blue-500" aria-hidden />
              Open project
            </div>
            <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
              File vault
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Deliverables for{" "}
              <span className="font-medium text-zinc-800">{project.title}</span>
            </p>
          </div>
          <Link
            href={`/dashboard/projects/${project.id}`}
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "shadow-sm",
            )}
          >
            Open workspace
            <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="rounded-2xl border border-blue-200/60 bg-white p-4 shadow-sm ring-1 ring-blue-100/60 sm:p-5">
          <FileVault projectId={project.id} assets={assets} />
        </div>
      </section>

      <section className="max-w-md rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-zinc-900">Your profile</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Freelancers see your display name. Manage it in Settings.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/settings"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "shadow-sm",
            )}
          >
            Edit in Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
