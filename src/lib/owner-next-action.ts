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
  deliverables: Array<Pick<Asset, "project_id" | "review_status">>,
): OwnerNextAction {
  const changes = deliverables.find((asset) => asset.review_status === "changes_requested");
  if (changes) return {
    title: "Revise the requested deliverable",
    description: "Your client left change requests. Upload the next version to keep the project moving.",
    href: `/dashboard/projects/${changes.project_id}`,
    label: "Open feedback",
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
    description: "Portal is sending the scheduled reminder; open the invoice to review its status.",
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
