"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  FolderKanban,
  Loader2,
  MessageSquareWarning,
  Sparkles,
} from "lucide-react";

import { reviewDeliverable } from "@/app/actions";
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
} from "@/components/dashboard/dashboard-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileVault } from "@/components/dashboard/file-vault";
import { LatestDeliverables } from "@/components/dashboard/latest-deliverables";
import { PaymentDueCalendar } from "@/components/dashboard/payment-due-calendar";
import { ProjectFilter } from "@/components/dashboard/project-filter";
import {
  InvoiceStatusBadge,
  ProjectStatusBadge,
} from "@/components/dashboard/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { businessDisplayName } from "@/lib/branding";
import type { ClientHomeData } from "@/lib/dashboard-data";
import { displayName, formatMoney, isCompletedProject } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { PaymentKind, Profile, ProjectStatus } from "@/types/database";
import { friendlyCheckoutError } from "@/utils/billing-errors";
import { createClient } from "@/utils/supabase/client";

type ClientHomeProps = {
  profile: Profile;
  home: ClientHomeData;
};

function formatShortDate(value: string) {
  const date = new Date(
    value.includes("T") ? value : `${value}T12:00:00`,
  );
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function paymentKindBadge(kind: PaymentKind | null | undefined) {
  if (!kind || kind === "standard" || kind === "standalone") return null;
  switch (kind) {
    case "deposit":
      return "Deposit";
    case "installment":
      return "Payment plan";
    case "retainer":
    case "recurring":
      return "Recurring";
    default:
      return kind;
  }
}

export function ClientHome({ profile, home }: ClientHomeProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(home.projects);
  const [error, setError] = useState<string | null>(null);
  const [payingId, setPayingId] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setProjects(home.projects);
  }, [home.projects]);

  const projectIdsKey = home.projects
    .map((project) => project.id)
    .sort()
    .join(",");

  useEffect(() => {
    if (!projectIdsKey) return;
    const projectIds = projectIdsKey.split(",");
    const supabase = createClient();
    const channel = supabase
      .channel("client-home-phases")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "projects" },
        (payload) => {
          const next = payload.new as { id?: string; status?: ProjectStatus };
          if (!next.id || !next.status || !projectIds.includes(next.id)) return;
          setProjects((current) =>
            current.map((project) =>
              project.id === next.id
                ? { ...project, status: next.status as ProjectStatus }
                : project,
            ),
          );
          router.refresh();
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectIdsKey, router]);

  const brandName = businessDisplayName(home.brand, "Your portal");
  const welcome =
    home.brand?.welcome_message?.trim() ||
    `Welcome back, ${displayName(profile)}.`;
  const activeProjects = projects.filter(
    (item) => !isCompletedProject(item.status),
  );
  const filterProjectId = home.selectedProjectId;
  const project =
    (filterProjectId
      ? projects.find((item) => item.id === filterProjectId)
      : null) ??
    home.activeProject ??
    activeProjects[0] ??
    projects[0] ??
    null;
  const invoicesHref = filterProjectId
    ? `/dashboard/invoices?project=${filterProjectId}`
    : "/dashboard/invoices";

  const pendingInvoices = home.invoices.filter(
    (invoice) => invoice.status === "pending",
  );
  const nextAction = home.nextAction;
  const openReviews = home.actions.filter(
    (action) =>
      action.status === "open" && action.action_type === "review_deliverable",
  );

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

  function submitReview(
    actionId: string,
    decision: "approved" | "changes_requested",
  ) {
    setError(null);
    const formData = new FormData();
    formData.set("actionId", actionId);
    formData.set("decision", decision);
    if (decision === "changes_requested") {
      formData.set("note", reviewNote);
    }
    startTransition(async () => {
      const result = await reviewDeliverable(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      setReviewNote("");
      router.refresh();
    });
  }

  if (projects.length === 0 || !project) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-primary)]">
            {brandName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Home
          </h1>
          <p className="text-sm text-zinc-500">{welcome}</p>
        </div>
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="When you are invited to a project, your status, payments, and deliverables will show up here. If you expected an invite, check your email or ask them to resend it."
        />
        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[color:var(--brand-primary)]">
            {brandName}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Home
          </h1>
          <p className="max-w-xl text-sm text-zinc-500">{welcome}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          {projects.length > 0 ? (
            <ProjectFilter
              projects={projects.map((item) => ({
                id: item.id,
                title: item.title,
              }))}
              value={filterProjectId}
              basePath="/dashboard"
            />
          ) : null}
          <p className="text-xs text-zinc-500">
            {activeProjects.length} active · {projects.length} total
          </p>
        </div>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {/* Next required action */}
      <section
        className={cn(
          "overflow-hidden rounded-2xl border shadow-sm",
          nextAction
            ? "border-[color:var(--brand-primary)]/30 bg-gradient-to-br from-[color:var(--brand-primary-soft)] via-white to-white"
            : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 via-white to-white",
        )}
      >
        <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <Sparkles className="size-3.5 text-[color:var(--brand-primary)]" />
              Next required action
            </div>
            {nextAction ? (
              <>
                <p className="text-lg font-semibold text-zinc-900">
                  {nextAction.title}
                </p>
                <p className="text-sm text-zinc-500">
                  {nextAction.description ??
                    nextAction.project?.title ??
                    "Action needed"}
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-semibold text-zinc-900">
                  You’re all caught up
                </p>
                <p className="text-sm text-zinc-500">
                  No open actions right now. New invoices and deliverables will
                  show up here.
                </p>
              </>
            )}
          </div>
          {nextAction?.action_type === "pay_invoice" &&
          nextAction.invoice_id ? (
            <Button
              size="sm"
              className="bg-[color:var(--brand-primary)] text-white shadow-sm hover:opacity-90"
              disabled={payingId === nextAction.invoice_id}
              onClick={() => void payInvoice(nextAction.invoice_id!)}
            >
              {payingId === nextAction.invoice_id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Pay now
            </Button>
          ) : nextAction?.action_type === "review_deliverable" ? (
            <Link
              href="#deliverable-reviews"
              className={cn(
                buttonVariants({ size: "sm" }),
                "bg-[color:var(--brand-primary)] text-white shadow-sm hover:opacity-90",
              )}
            >
              Review
            </Link>
          ) : nextAction?.action_type === "review_project" ? (
            <Link
              href={`/dashboard/projects/${nextAction.project_id}`}
              className={cn(
                buttonVariants({ size: "sm", variant: "outline" }),
                "shadow-sm",
              )}
            >
              Open project
              <ArrowUpRight className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-3 lg:gap-6">
        {/* Amount due */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <CircleDollarSign className="size-3.5 text-[color:var(--brand-primary)]" />
            Amount due
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {formatMoney(home.amountDueCents)}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {pendingInvoices.length} unpaid invoice
            {pendingInvoices.length === 1 ? "" : "s"}
          </p>
          <Link
            href={invoicesHref}
            className="mt-3 inline-flex text-xs font-medium text-[color:var(--brand-primary)] hover:underline"
          >
            View invoices
          </Link>
        </section>

        {/* Next payment date */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <CalendarDays className="size-3.5 text-[color:var(--brand-accent)]" />
            Next payment
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {home.nextPaymentDate
              ? formatShortDate(home.nextPaymentDate)
              : "-"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {home.nextPaymentDate
              ? "Earliest unpaid due date"
              : "No upcoming payment dates"}
          </p>
        </section>

        {/* Project status */}
        <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
            <FolderKanban className="size-3.5 text-[color:var(--brand-primary)]" />
            {filterProjectId ? "Current project" : "Focus project"}
          </div>
          <p className="mt-2 truncate text-lg font-semibold text-zinc-900">
            {filterProjectId
              ? project.title
              : activeProjects.length > 1
                ? `${activeProjects.length} active projects`
                : project.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {filterProjectId || activeProjects.length <= 1 ? (
              <ProjectStatusBadge status={project.status} />
            ) : null}
            <span className="text-xs text-zinc-500">
              {filterProjectId
                ? businessDisplayName(project.freelancer, "Workspace")
                : "Showing all projects"}
            </span>
          </div>
          <Link
            href={
              filterProjectId
                ? `/dashboard/projects/${project.id}`
                : "/dashboard/projects"
            }
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[color:var(--brand-primary)] hover:underline"
          >
            {filterProjectId ? "Open workspace" : "View projects"}
            <ArrowUpRight className="size-3" />
          </Link>
        </section>
      </div>

      <PaymentDueCalendar
        invoices={home.invoices}
        linkMode="invoices"
        onPayInvoice={(invoiceId) => void payInvoice(invoiceId)}
        payingId={payingId}
        className="w-full max-h-[32rem]"
      />

      <DashboardCard className="border-zinc-200/80 bg-white" fillHeight={false}>
        <DashboardCardHeader className="bg-white">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <CircleDollarSign className="size-4 text-[color:var(--brand-primary)]" />
              Unpaid invoices
            </div>
            <Link
              href={invoicesHref}
              className="text-xs font-medium text-[color:var(--brand-primary)] hover:underline"
            >
              All invoices
            </Link>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {pendingInvoices.length === 0
              ? "Nothing outstanding"
              : `${pendingInvoices.length} unpaid · ${formatMoney(home.amountDueCents)} due`}
          </p>
        </DashboardCardHeader>
        <DashboardCardBody>
          {pendingInvoices.length === 0 ? (
            <EmptyState
              icon={CircleDollarSign}
              className="border-0 bg-transparent py-6"
              title="No unpaid invoices"
              description="When a payment is requested, it will show up here below the calendar."
            />
          ) : (
            <ul className="grid gap-2">
              {pendingInvoices.map((invoice) => (
                <li
                  key={invoice.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-200/80 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-900">
                        {formatMoney(invoice.amount, invoice.currency)}
                      </p>
                      <InvoiceStatusBadge status="pending" />
                      {paymentKindBadge(invoice.payment_kind) ? (
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600">
                          {paymentKindBadge(invoice.payment_kind)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {invoice.title?.trim() ||
                        invoice.project?.title ||
                        "Invoice"}
                      {invoice.due_date
                        ? ` · due ${formatShortDate(invoice.due_date)}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="bg-[color:var(--brand-primary)] text-white hover:opacity-90"
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
        </DashboardCardBody>
      </DashboardCard>

      <LatestDeliverables items={home.allDeliverables} />

      {/* Deliverable reviews */}
      {openReviews.length > 0 ? (
        <section
          id="deliverable-reviews"
          className="space-y-3 rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm sm:p-5"
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <MessageSquareWarning className="size-4 text-amber-700" />
            Deliverables awaiting your review
          </div>
          <ul className="grid gap-3">
            {openReviews.map((action) => (
              <li
                key={action.id}
                className="rounded-xl border border-amber-200/70 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-zinc-900">
                  {action.title}
                </p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {action.project?.title ?? "Project"}
                  {action.asset?.file_name
                    ? ` · ${action.asset.file_name}`
                    : ""}
                </p>
                <label className="mt-3 block space-y-1.5">
                  <span className="text-xs font-medium text-zinc-500">
                    Note (optional for changes)
                  </span>
                  <textarea
                    value={reviewNote}
                    onChange={(event) => setReviewNote(event.target.value)}
                    rows={2}
                    placeholder="What should change?"
                    className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none ring-[color:var(--brand-primary)] focus:ring-2"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    className="bg-emerald-600 text-white hover:bg-emerald-700"
                    disabled={pending}
                    onClick={() => submitReview(action.id, "approved")}
                  >
                    {pending ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-4" />
                    )}
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      submitReview(action.id, "changes_requested")
                    }
                  >
                    Request changes
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Recent activity */}
      <section className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <Clock3 className="size-4 text-zinc-500" />
          Recent activity
        </div>
        {home.activity.length === 0 ? (
          <p className="text-sm text-zinc-500">No recent activity yet.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {home.activity.slice(0, 8).map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-900">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-zinc-500">
                    {item.description}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-zinc-400">
                  {formatShortDate(item.at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* File vault for focus / filtered project */}
      <section className="space-y-3">
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-900">
            Shared files
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Deliverables for{" "}
            <span className="font-medium text-zinc-800">{project.title}</span>
            {!filterProjectId && activeProjects.length > 1
              ? " (pick a project above to switch)"
              : ""}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white p-4 shadow-sm sm:p-5">
          <FileVault projectId={project.id} assets={home.assets} />
        </div>
      </section>
    </div>
  );
}
