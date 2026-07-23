import {
  pickNextRequiredAction,
  type ClientActionWithLinks,
} from "@/lib/client-action-helpers";
import { isCompletedProject } from "@/lib/format";
import { isInvoiceOutstanding, type Asset, type BusinessBrand, type Invoice, type Project } from "@/types/database";

export type FreelancerProject = Project & {
  client?: { email: string; full_name: string | null } | null;
  pendingInvoiceCount?: number;
};

export type ClientProject = Project & {
  freelancer?: BusinessBrand | null;
};

export type InvoiceWithProject = Invoice & {
  project?: { title: string } | null;
};

export type ClientActivityItem = {
  id: string;
  kind:
    | "invoice_created"
    | "invoice_paid"
    | "deliverable_shared"
    | "phase_change"
    | "action_completed";
  title: string;
  description: string;
  at: string;
  projectId?: string | null;
  projectTitle?: string | null;
};

export type ClientUpcomingItem = {
  id: string;
  label: string;
  date: string;
  kind: "invoice_due" | "action_due";
  projectId?: string | null;
  href?: string;
};

export type ClientHomeData = {
  projects: ClientProject[];
  selectedProjectId: string | null;
  assets: Asset[];
  allDeliverables: (Asset & { projectTitle: string })[];
  invoices: InvoiceWithProject[];
  actions: ClientActionWithLinks[];
  brand: BusinessBrand | null;
  amountDueCents: number;
  nextPaymentDate: string | null;
  nextAction: ClientActionWithLinks | null;
  upcoming: ClientUpcomingItem[];
  activity: ClientActivityItem[];
  activeProject: ClientProject | null;
};

/**
 * Filter already-loaded client workspace data by project (no network / RSC).
 * Pass null for “All projects”.
 */
export function scopeClientHomeData(
  home: ClientHomeData,
  selectedProjectId: string | null,
): ClientHomeData {
  const filterProjectId =
    selectedProjectId &&
    home.projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : null;

  const invoices = filterProjectId
    ? home.invoices.filter((invoice) => invoice.project_id === filterProjectId)
    : home.invoices;
  const actions = filterProjectId
    ? home.actions.filter((action) => action.project_id === filterProjectId)
    : home.actions;
  const allDeliverables = filterProjectId
    ? home.allDeliverables.filter(
        (asset) => asset.project_id === filterProjectId,
      )
    : home.allDeliverables;
  const activity = filterProjectId
    ? home.activity.filter((item) => item.projectId === filterProjectId)
    : home.activity;
  const upcoming = filterProjectId
    ? home.upcoming.filter((item) => item.projectId === filterProjectId)
    : home.upcoming;

  const focusProject =
    (filterProjectId
      ? home.projects.find((project) => project.id === filterProjectId)
      : null) ??
    home.projects.find((project) => !isCompletedProject(project.status)) ??
    home.projects[0] ??
    null;

  const assets = filterProjectId
    ? home.assets.filter((asset) => asset.project_id === filterProjectId)
    : focusProject
      ? home.assets.filter((asset) => asset.project_id === focusProject.id)
      : [];

  const pendingInvoices = invoices.filter(
    (invoice) => isInvoiceOutstanding(invoice.status),
  );
  const amountDueCents = pendingInvoices.reduce(
    (sum, invoice) => sum + invoice.amount,
    0,
  );
  const datedPending = pendingInvoices
    .filter((invoice) => invoice.due_date)
    .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  const nextPaymentDate =
    datedPending[0]?.due_date ??
    pendingInvoices
      .slice()
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]
      ?.created_at?.slice(0, 10) ??
    null;

  const brand =
    focusProject?.freelancer ??
    home.projects.find((project) => !isCompletedProject(project.status))
      ?.freelancer ??
    home.projects[0]?.freelancer ??
    home.brand;

  const invoicesHref = filterProjectId
    ? `/dashboard/invoices?project=${filterProjectId}`
    : "/dashboard/invoices";
  const homeHref = filterProjectId
    ? `/dashboard?project=${filterProjectId}`
    : "/dashboard";

  return {
    ...home,
    selectedProjectId: filterProjectId,
    invoices,
    actions,
    allDeliverables,
    assets,
    activity: activity.slice(0, 12),
    upcoming: upcoming.slice(0, 6).map((item) => ({
      ...item,
      href: item.kind === "invoice_due" ? invoicesHref : homeHref,
    })),
    amountDueCents,
    nextPaymentDate,
    nextAction: pickNextRequiredAction(actions, invoices),
    activeProject: focusProject,
    brand,
  };
}
