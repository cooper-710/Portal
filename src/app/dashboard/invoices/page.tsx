import { redirect } from "next/navigation";

import { ClientInvoicesPage } from "@/components/dashboard/client-invoices-page";
import { FreelancerInvoicesPage } from "@/components/dashboard/freelancer-invoices-page";
import { FreelancerLockedPreview } from "@/components/dashboard/subscription-gate";
import {
  loadClientWorkspace,
  loadFreelancerWorkspace,
  requireDashboardProfile,
} from "@/lib/dashboard-data";
import { displayName } from "@/lib/format";
import type { Profile } from "@/types/database";
import { freelancerHasWorkspaceAccess } from "@/utils/stripe/subscription";
import { syncCheckoutSessionById } from "@/utils/stripe/sync-invoice";

type InvoicesPageProps = {
  searchParams: Promise<{
    paid?: string;
    canceled?: string;
    session_id?: string;
    connect?: string;
    project?: string;
  }>;
};

export default async function DashboardInvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const params = await searchParams;
  const { profile } = await requireDashboardProfile();

  if (params.paid === "1" && params.session_id) {
    await syncCheckoutSessionById(params.session_id);
    redirect("/dashboard/invoices");
  }

  const paymentNotice =
    params.canceled === "1"
      ? "Checkout was canceled. Your invoice is still pending."
      : null;

  return (
    <>
      {paymentNotice ? (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950 shadow-sm">
          {paymentNotice}
        </p>
      ) : null}
      {profile.role === "freelancer" ? (
        <FreelancerInvoicesView
          profile={profile}
          connectStatus={params.connect ?? null}
          selectedProjectId={params.project ?? null}
        />
      ) : (
        <ClientInvoicesView
          profile={profile}
          selectedProjectId={params.project ?? null}
        />
      )}
    </>
  );
}

async function FreelancerInvoicesView({
  profile,
  connectStatus,
  selectedProjectId,
}: {
  profile: Profile;
  connectStatus: string | null;
  selectedProjectId: string | null;
}) {
  if (!freelancerHasWorkspaceAccess(profile)) {
    return (
      <FreelancerLockedPreview
        title="Invoices"
        subtitle="Start a free trial to bill clients and track payments"
        email={displayName(profile)}
      />
    );
  }

  const { projects, invoices } = await loadFreelancerWorkspace(profile.id);
  const filterProjectId =
    selectedProjectId && projects.some((project) => project.id === selectedProjectId)
      ? selectedProjectId
      : null;

  return (
    <FreelancerInvoicesPage
      profile={profile}
      projects={projects}
      invoices={invoices}
      connectStatus={connectStatus}
      selectedProjectId={filterProjectId}
    />
  );
}

async function ClientInvoicesView({
  profile,
  selectedProjectId,
}: {
  profile: Profile;
  selectedProjectId: string | null;
}) {
  const { invoices, projects, selectedProjectId: filterId } =
    await loadClientWorkspace(profile.id, selectedProjectId);
  return (
    <ClientInvoicesPage
      profile={profile}
      invoices={invoices}
      projects={projects.map((project) => ({
        id: project.id,
        title: project.title,
      }))}
      selectedProjectId={filterId}
    />
  );
}
