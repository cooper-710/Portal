import type { FreelancerProject, InvoiceWithProject } from "@/lib/client-home-scope";
import type { Asset } from "@/types/database";
import { isInvoiceOutstanding } from "@/types/database";

export type OwnerNextAction = {
  title: string;
  description: string;
  href: string;
  label: string;
};

export function pickOwnerNextAction(
  projects: FreelancerProject[],
  invoices: InvoiceWithProject[],
  deliverables: Array<
    Pick<
      Asset,
      | "project_id"
      | "review_status"
      | "feedback_reviewed_at"
      | "feedback_resolved_at"
    >
  >,
): OwnerNextAction {
  const activeProjectIds = new Set(
    projects
      .filter((project) => !["completed", "archived"].includes(project.status))
      .map((project) => project.id),
  );
  const changes = deliverables.find(
    (asset) =>
      asset.review_status === "changes_requested" &&
      !asset.feedback_resolved_at &&
      activeProjectIds.has(asset.project_id),
  );
  if (changes) return {
    title: changes.feedback_reviewed_at
      ? "Respond to reviewed feedback"
      : "Review your client’s feedback",
    description: changes.feedback_reviewed_at
      ? "Upload a revised deliverable, or complete the project if no new file is needed."
      : "Read the change request and mark it reviewed before choosing the next step.",
    href: `/dashboard/projects/${changes.project_id}#deliverable-feedback`,
    label: changes.feedback_reviewed_at ? "Choose next step" : "Review feedback",
  };

  if (projects.length === 0) return {
    title: "Create your first client project",
    description: "Start the invite → deliver → approve → pay workflow.",
    href: "/dashboard/projects",
    label: "Create project",
  };

  const uninvited = projects.find((project) => !project.client_id && !project.client_email);
  if (uninvited) return {
    title: `Invite a client to ${uninvited.title}`,
    description: "Add their email so they can review deliverables and pay invoices.",
    href: `/dashboard/projects/${uninvited.id}`,
    label: "Add client",
  };

  const today = new Date().toISOString().slice(0, 10);
  const overdue = invoices.find((invoice) =>
    isInvoiceOutstanding(invoice.status) && invoice.due_date && invoice.due_date < today,
  );
  if (overdue) return {
    title: "Follow up on an overdue invoice",
    description: "Finalia is sending the scheduled reminder; open the invoice to review its status.",
    href: `/dashboard/invoices?project=${encodeURIComponent(overdue.project_id)}`,
    label: "Review invoice",
  };

  const review = projects.find((project) => project.status === "review" || project.status === "in_review");
  if (review) return {
    title: `Track final approval for ${review.title}`,
    description: "The client has one clear approval action. You’ll be notified when they respond.",
    href: `/dashboard/projects/${review.id}`,
    label: "View review",
  };

  const active = projects.find((project) => !["completed", "archived"].includes(project.status));
  if (active) return {
    title: `Move ${active.title} forward`,
    description: "Share the next deliverable or advance the project phase.",
    href: `/dashboard/projects/${active.id}`,
    label: "Open project",
  };

  return {
    title: "Start the next project",
    description: "Your current work is closed out and ready for the next client engagement.",
    href: "/dashboard/projects",
    label: "View projects",
  };
}
