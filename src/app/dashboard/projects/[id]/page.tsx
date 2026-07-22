import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronRight, FileText, Receipt, Upload } from "lucide-react";

import { ClientEmailEditor } from "@/components/dashboard/client-email-editor";
import { EmptyState } from "@/components/dashboard/empty-state";
import { FileVault } from "@/components/dashboard/file-vault";
import { ProjectInvoicesPanel } from "@/components/dashboard/project-invoices-panel";
import { ProjectOwnerActions } from "@/components/dashboard/project-owner-actions";
import { ProjectApprovalPanel } from "@/components/dashboard/project-approval-panel";
import { ProjectPhaseSelector } from "@/components/dashboard/project-phase-selector";
import {
  FreelancerLockedPreview,
} from "@/components/dashboard/subscription-gate";
import {
  ProjectStatusBadge,
} from "@/components/dashboard/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney, displayName, projectClientLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { isInvoiceOutstanding, type Asset, type ClientAction, type Invoice, type Profile, type Project } from "@/types/database";
import { freelancerHasWorkspaceAccess } from "@/utils/stripe/subscription";
import { createClient } from "@/utils/supabase/server";

type ProjectPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ review?: string }>;
};

export default async function ProjectPage({ params, searchParams }: ProjectPageProps) {
  const [{ id }, { review }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  const typedProfile = profile as Profile;

  // Locked freelancers see FOMO placeholders, not a working project workspace.
  if (
    typedProfile.role === "freelancer" &&
    !freelancerHasWorkspaceAccess(typedProfile)
  ) {
    return (
      <FreelancerLockedPreview
        title="Project workspace"
        subtitle="Start a free trial to open projects, files, and invoices"
        email={displayName(typedProfile)}
      />
    );
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!projectRow) {
    notFound();
  }

  const project = projectRow as Project;
  const isFreelancer = project.freelancer_id === typedProfile.id;
  const isClient = project.client_id === typedProfile.id;

  if (!isFreelancer && !isClient) {
    notFound();
  }

  const [
    { data: assetRows },
    { data: invoiceRows },
    { data: approvalRows },
    { data: deliverableReviewRows },
  ] = await Promise.all([
    supabase
      .from("assets")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("*")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_actions")
      .select("*")
      .eq("project_id", project.id)
      .eq("action_type", "review_project")
      .order("created_at", { ascending: false }),
    supabase
      .from("client_actions")
      .select("*")
      .eq("project_id", project.id)
      .eq("action_type", "review_deliverable")
      .order("created_at", { ascending: false }),
  ]);

  const assets = (assetRows ?? []) as Asset[];
  const invoices = (invoiceRows ?? []) as Invoice[];
  const approvalActions = (approvalRows ?? []) as ClientAction[];
  const deliverableReviewActions = (deliverableReviewRows ?? []) as ClientAction[];
  const pendingInvoiceCount = invoices.filter(
    (invoice) => isInvoiceOutstanding(invoice.status),
  ).length;

  let resolvedClientEmail = project.client_email ?? "";
  let resolvedClientName: string | null = null;
  if (project.client_id) {
    const { data: client } = await supabase
      .from("users")
      .select("email, full_name")
      .eq("id", project.client_id)
      .maybeSingle();
    resolvedClientEmail = client?.email ?? project.client_email ?? "";
    resolvedClientName = client?.full_name ?? null;
  }

  const clientCardLabel = projectClientLabel(
    project.client_id
      ? { email: resolvedClientEmail, full_name: resolvedClientName }
      : null,
    project.client_email,
  );

  const activity = [
    ...assets.map((asset) => ({
      id: `asset-${asset.id}`,
      at: asset.created_at,
      label: `File uploaded · ${asset.file_name ?? "Untitled"}`,
      icon: Upload,
    })),
    ...invoices.map((invoice) => ({
      id: `invoice-${invoice.id}`,
      at: invoice.created_at,
      label: `Invoice ${invoice.status} · ${formatMoney(invoice.amount, invoice.currency)}`,
      icon: Receipt,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <section
        className={cn(
          "overflow-hidden rounded-2xl border border-blue-200/70 bg-white shadow-sm",
          "ring-1 ring-blue-100/80",
        )}
      >
        <div className="border-b border-blue-100/80 bg-gradient-to-r from-blue-50/90 via-white to-white px-4 py-5 sm:px-6 sm:py-6">
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1 text-xs text-zinc-500"
          >
            <Link
              href="/dashboard"
              className="font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Portal
            </Link>
            <ChevronRight className="size-3 shrink-0 text-zinc-400" aria-hidden />
            <Link
              href="/dashboard/projects"
              className="font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Projects
            </Link>
            <ChevronRight className="size-3 shrink-0 text-zinc-400" aria-hidden />
            <span className="truncate font-semibold text-blue-700">
              {project.title}
            </span>
          </nav>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-800">
                  <span className="size-1.5 rounded-full bg-blue-500" aria-hidden />
                  Project workspace
                </span>
                {!isFreelancer ? (
                  <ProjectStatusBadge status={project.status} />
                ) : null}
              </div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
                {project.title}
              </h1>
              <p className="text-sm text-zinc-500">
                Updated {new Date(project.updated_at).toLocaleString()}
              </p>
            </div>
            {isFreelancer ? (
              <div className="flex w-full max-w-xs shrink-0 flex-col gap-3">
                <div className="flex justify-end">
                  <ProjectOwnerActions
                    project={project}
                    pendingInvoiceCount={pendingInvoiceCount}
                    redirectOnDelete="/dashboard/projects"
                  />
                </div>
                <ProjectPhaseSelector
                  projectId={project.id}
                  status={project.status}
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Files</CardDescription>
            <CardTitle className="text-3xl tracking-tight">{assets.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Invoices</CardDescription>
            <CardTitle className="text-3xl tracking-tight">
              {invoices.length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader className="pb-3">
            <CardDescription>Client</CardDescription>
            <CardTitle className="truncate text-base font-medium">
              {clientCardLabel}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {project.client_id
                ? resolvedClientName
                  ? resolvedClientEmail
                  : "Linked account"
                : "Pending invite"}
            </p>
          </CardHeader>
        </Card>
      </div>

      {isFreelancer ? (
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Client access</CardTitle>
            <CardDescription>
              Update the client email anytime. New or changed emails trigger an
              invite.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ClientEmailEditor
              projectId={project.id}
              initialEmail={resolvedClientEmail}
              linked={Boolean(project.client_id)}
            />
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>File vault</CardTitle>
            <CardDescription>
              {isFreelancer
                ? "Tag files as internal reference or client deliverables. Clients can view and download deliverables only."
                : "Preview shared deliverables here, then approve them or request changes in context."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileVault
              projectId={project.id}
              assets={assets}
              canManageVisibility={isFreelancer}
              reviewActions={isClient ? deliverableReviewActions : []}
              initialReviewAssetId={isClient ? review ?? null : null}
            />
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 shadow-sm">
          <CardHeader>
            <CardTitle>Activity</CardTitle>
            <CardDescription>Recent files and invoice events</CardDescription>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState
                icon={FileText}
                className="py-8"
                title="No activity yet"
                description="Uploads and invoices for this project will show up here."
              />
            ) : (
              <ul className="space-y-3">
                {activity.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-white px-3 py-2.5"
                  >
                    <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50">
                      <item.icon className="size-3.5 text-zinc-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-900">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(item.at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>Project approval</CardTitle>
          <CardDescription>
            Final acceptance and change requests stay recorded with the project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectApprovalPanel actions={approvalActions} isClient={isClient} />
        </CardContent>
      </Card>

      <Card className="border-zinc-200/80 shadow-sm">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            {isFreelancer
              ? "Create and track invoices for this project. Clients pay to your connected Stripe account."
              : "Invoices for this project"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectInvoicesPanel
            projectId={project.id}
            projectTitle={project.title}
            invoices={invoices}
            canManage={isFreelancer}
          />
        </CardContent>
      </Card>
    </div>
  );
}
