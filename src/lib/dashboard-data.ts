import { redirect } from "next/navigation";

import {
  pickNextRequiredAction,
  type ClientActionWithLinks,
} from "@/lib/client-actions";
import { formatMoney, isCompletedProject } from "@/lib/format";
import type {
  Asset,
  BusinessBrand,
  ClientAction,
  Invoice,
  Profile,
  Project,
} from "@/types/database";
import { createClient } from "@/utils/supabase/server";

export type FreelancerProject = Project & {
  client?: { email: string; full_name: string | null } | null;
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
  projectTitle?: string | null;
};

export type ClientUpcomingItem = {
  id: string;
  label: string;
  date: string;
  kind: "invoice_due" | "action_due";
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

export async function requireDashboardProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (user.email) {
    await supabase.rpc("link_projects_for_client", {
      p_user_id: user.id,
      p_email: user.email,
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  return {
    supabase,
    user,
    profile: profile as Profile,
  };
}

const BRAND_SELECT =
  "id, email, full_name, business_name, logo_url, brand_primary, brand_accent, welcome_message, appearance";

function toBrand(
  row: {
    email: string;
    full_name: string | null;
    business_name?: string | null;
    logo_url?: string | null;
    brand_primary?: string | null;
    brand_accent?: string | null;
    welcome_message?: string | null;
    appearance?: string | null;
  } | null,
): BusinessBrand | null {
  if (!row) return null;
  return {
    email: row.email,
    full_name: row.full_name ?? null,
    business_name: row.business_name ?? null,
    logo_url: row.logo_url ?? null,
    brand_primary: row.brand_primary ?? null,
    brand_accent: row.brand_accent ?? null,
    welcome_message: row.welcome_message ?? null,
    appearance: (row.appearance as BusinessBrand["appearance"]) ?? "light",
  };
}

export async function loadFreelancerWorkspace(profileId: string) {
  const supabase = await createClient();

  const { data: projectRows } = await supabase
    .from("projects")
    .select("*")
    .eq("freelancer_id", profileId)
    .order("updated_at", { ascending: false });

  const projects = (projectRows ?? []) as Project[];
  const clientIds = [
    ...new Set(projects.map((project) => project.client_id).filter(Boolean)),
  ] as string[];

  const clientsById = new Map<string, { email: string; full_name: string | null }>();
  if (clientIds.length > 0) {
    const { data: clients } = await supabase
      .from("users")
      .select("id, email, full_name")
      .in("id", clientIds);

    for (const client of clients ?? []) {
      clientsById.set(client.id, {
        email: client.email,
        full_name: client.full_name ?? null,
      });
    }
  }

  const projectIds = projects.map((project) => project.id);
  const projectTitleById = new Map(
    projects.map((project) => [project.id, project.title]),
  );

  let invoices: Invoice[] = [];
  if (projectIds.length > 0) {
    const { data: invoiceRows } = await supabase
      .from("invoices")
      .select("*")
      .in("project_id", projectIds)
      .order("created_at", { ascending: false });
    invoices = (invoiceRows ?? []) as Invoice[];
  }

  let deliverables: (Asset & { projectTitle: string })[] = [];
  if (projectIds.length > 0) {
    const { data: deliverableRows } = await supabase
      .from("assets")
      .select("*")
      .in("project_id", projectIds)
      .eq("visibility", "deliverable")
      .order("created_at", { ascending: false })
      .limit(12);
    deliverables = ((deliverableRows ?? []) as Asset[]).map((asset) => ({
      ...asset,
      projectTitle: projectTitleById.get(asset.project_id) ?? "Project",
    }));
  }

  return {
    projects: projects.map((project) => ({
      ...project,
      client: project.client_id
        ? (clientsById.get(project.client_id) ?? null)
        : null,
    })) as FreelancerProject[],
    invoices: invoices.map((invoice) => ({
      ...invoice,
      project: projectTitleById.has(invoice.project_id)
        ? { title: projectTitleById.get(invoice.project_id)! }
        : null,
    })) as InvoiceWithProject[],
    deliverables,
  };
}

export async function loadClientWorkspace(
  profileId: string,
  selectedProjectId?: string | null,
): Promise<ClientHomeData> {
  const supabase = await createClient();

  const { data: projectRows } = await supabase
    .from("projects")
    .select("*")
    .eq("client_id", profileId)
    .order("updated_at", { ascending: false });

  const projects = (projectRows ?? []) as Project[];

  if (projects.length === 0) {
    return {
      projects: [] as ClientProject[],
      selectedProjectId: null,
      assets: [],
      allDeliverables: [],
      invoices: [],
      actions: [],
      brand: null,
      amountDueCents: 0,
      nextPaymentDate: null,
      nextAction: null,
      upcoming: [],
      activity: [],
      activeProject: null,
    };
  }

  const filterProjectId =
    selectedProjectId &&
    projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : null;

  const vaultProjectRow =
    (filterProjectId
      ? projects.find((project) => project.id === filterProjectId)
      : null) ??
    projects.find((project) => !isCompletedProject(project.status)) ??
    projects[0];

  const freelancerIds = [
    ...new Set(projects.map((project) => project.freelancer_id)),
  ];
  const freelancersById = new Map<string, BusinessBrand>();
  if (freelancerIds.length > 0) {
    const { data: freelancers } = await supabase
      .from("users")
      .select(BRAND_SELECT)
      .in("id", freelancerIds);

    for (const freelancer of freelancers ?? []) {
      const brand = toBrand(freelancer);
      if (brand) freelancersById.set(freelancer.id, brand);
    }
  }

  const projectIds = projects.map((project) => project.id);
  const projectTitleById = new Map(
    projects.map((project) => [project.id, project.title]),
  );

  const scopedProjectIds = filterProjectId ? [filterProjectId] : projectIds;

  const [
    { data: assetRows },
    { data: allAssetRows },
    { data: invoiceRows },
    { data: actionRows },
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("project_id", vaultProjectRow.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("assets")
      .select("*")
      .in("project_id", scopedProjectIds)
      .eq("visibility", "deliverable")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("invoices")
      .select("*")
      .in("project_id", scopedProjectIds)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_actions")
      .select("*")
      .eq("client_id", profileId)
      .in("project_id", scopedProjectIds)
      .order("created_at", { ascending: false })
      .limit(40),
  ]);

  const invoices = (invoiceRows ?? []) as Invoice[];
  const actions = (actionRows ?? []) as ClientAction[];

  const invoiceById = new Map(invoices.map((invoice) => [invoice.id, invoice]));
  const assetsAll = (allAssetRows ?? []) as Asset[];
  const assetById = new Map(assetsAll.map((asset) => [asset.id, asset]));

  const actionsWithLinks: ClientActionWithLinks[] = actions.map((action) => {
    const invoice = action.invoice_id
      ? invoiceById.get(action.invoice_id)
      : null;
    const asset = action.asset_id ? assetById.get(action.asset_id) : null;
    return {
      ...action,
      metadata: (action.metadata ?? {}) as Record<string, unknown>,
      project: projectTitleById.has(action.project_id)
        ? { title: projectTitleById.get(action.project_id)! }
        : null,
      invoice: invoice
        ? {
            amount: invoice.amount,
            currency: invoice.currency,
            status: invoice.status,
            due_date: invoice.due_date,
            payment_kind: invoice.payment_kind,
          }
        : null,
      asset: asset
        ? {
            file_name: asset.file_name,
            review_status: asset.review_status,
          }
        : null,
    };
  });

  const pendingInvoices = invoices.filter(
    (invoice) => invoice.status === "pending",
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
      .sort((a, b) => a.created_at.localeCompare(b.created_at))[0]?.created_at
        ?.slice(0, 10) ??
    null;

  const upcoming: ClientUpcomingItem[] = [];
  for (const invoice of datedPending.slice(0, 5)) {
    upcoming.push({
      id: `inv-${invoice.id}`,
      label: `${invoice.title?.trim() || "Payment"} · ${formatMoney(invoice.amount, invoice.currency)}`,
      date: invoice.due_date!,
      kind: "invoice_due",
      href: filterProjectId
        ? `/dashboard/invoices?project=${filterProjectId}`
        : "/dashboard/invoices",
    });
  }
  for (const action of actionsWithLinks.filter(
    (item) => item.status === "open" && item.due_at,
  )) {
    upcoming.push({
      id: `act-${action.id}`,
      label: action.title,
      date: action.due_at!.slice(0, 10),
      kind: "action_due",
      href: filterProjectId
        ? `/dashboard?project=${filterProjectId}`
        : "/dashboard",
    });
  }
  upcoming.sort((a, b) => a.date.localeCompare(b.date));

  const activityProjects = filterProjectId
    ? projects.filter((project) => project.id === filterProjectId)
    : projects;

  const activity: ClientActivityItem[] = [];
  for (const invoice of invoices.slice(0, 10)) {
    activity.push({
      id: `inv-created-${invoice.id}`,
      kind: "invoice_created",
      title: invoice.status === "paid" ? "Invoice paid" : "Invoice sent",
      description: `${formatMoney(invoice.amount, invoice.currency)} · ${projectTitleById.get(invoice.project_id) ?? "Project"}`,
      at: invoice.status === "paid" ? invoice.updated_at : invoice.created_at,
      projectTitle: projectTitleById.get(invoice.project_id) ?? null,
    });
    if (invoice.status === "paid") {
      activity.push({
        id: `inv-paid-${invoice.id}`,
        kind: "invoice_paid",
        title: "Payment received",
        description: `${formatMoney(invoice.amount, invoice.currency)} · ${projectTitleById.get(invoice.project_id) ?? "Project"}`,
        at: invoice.updated_at,
        projectTitle: projectTitleById.get(invoice.project_id) ?? null,
      });
    }
  }
  for (const asset of assetsAll.slice(0, 8)) {
    activity.push({
      id: `del-${asset.id}`,
      kind: "deliverable_shared",
      title: "New deliverable",
      description: `${asset.file_name ?? "File"} · ${projectTitleById.get(asset.project_id) ?? "Project"}`,
      at: asset.created_at,
      projectTitle: projectTitleById.get(asset.project_id) ?? null,
    });
  }
  for (const project of activityProjects) {
    if (project.status === "review" || project.status === "in_progress") {
      activity.push({
        id: `phase-${project.id}-${project.updated_at}`,
        kind: "phase_change",
        title: `Project ${project.status === "review" ? "in review" : "in progress"}`,
        description: project.title,
        at: project.updated_at,
        projectTitle: project.title,
      });
    }
  }
  for (const action of actionsWithLinks.filter(
    (item) => item.status === "completed",
  ).slice(0, 6)) {
    activity.push({
      id: `done-${action.id}`,
      kind: "action_completed",
      title: "Action completed",
      description: action.title,
      at: action.completed_at ?? action.updated_at,
      projectTitle: action.project?.title ?? null,
    });
  }
  activity.sort((a, b) => b.at.localeCompare(a.at));

  const clientProjects = projects.map((project) => ({
    ...project,
    freelancer: freelancersById.get(project.freelancer_id) ?? null,
  })) as ClientProject[];

  const activeProject =
    clientProjects.find((project) => project.id === vaultProjectRow.id) ??
    clientProjects[0] ??
    null;

  // Prefer brand from filtered/vault project; fall back to most recent active.
  const brand =
    activeProject?.freelancer ??
    clientProjects.find((project) => !isCompletedProject(project.status))
      ?.freelancer ??
    clientProjects[0]?.freelancer ??
    null;

  return {
    projects: clientProjects,
    selectedProjectId: filterProjectId,
    assets: (assetRows ?? []) as Asset[],
    allDeliverables: assetsAll.map((asset) => ({
      ...asset,
      projectTitle: projectTitleById.get(asset.project_id) ?? "Project",
    })),
    invoices: invoices.map((invoice) => ({
      ...invoice,
      project: projectTitleById.has(invoice.project_id)
        ? { title: projectTitleById.get(invoice.project_id)! }
        : null,
    })) as InvoiceWithProject[],
    actions: actionsWithLinks,
    brand,
    amountDueCents,
    nextPaymentDate,
    nextAction: pickNextRequiredAction(actionsWithLinks),
    upcoming: upcoming.slice(0, 6),
    activity: activity.slice(0, 12),
    activeProject,
  };
}

/** Brand for client chrome (nav/layout), primary freelancer across projects. */
export async function loadClientBrand(profileId: string) {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("freelancer_id, updated_at")
    .eq("client_id", profileId)
    .order("updated_at", { ascending: false })
    .limit(1);

  const freelancerId = projects?.[0]?.freelancer_id;
  if (!freelancerId) return null;

  const { data: freelancer } = await supabase
    .from("users")
    .select(BRAND_SELECT)
    .eq("id", freelancerId)
    .maybeSingle();

  return toBrand(freelancer);
}
