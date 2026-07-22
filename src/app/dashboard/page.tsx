import { redirect } from "next/navigation";

import { ClientHome } from "@/components/dashboard/client-home";
import { FreelancerDashboard } from "@/components/dashboard/freelancer-dashboard";
import { FreelancerLockedPreview } from "@/components/dashboard/subscription-gate";
import {
  loadClientWorkspace,
  loadFreelancerWorkspace,
  requireDashboardProfile,
} from "@/lib/dashboard-data";
import { displayName } from "@/lib/format";
import type { Profile } from "@/types/database";
import {
  freelancerHasWorkspaceAccess,
  isPlatformSubscriptionActive,
} from "@/utils/stripe/subscription";
import { syncCheckoutSessionById } from "@/utils/stripe/sync-invoice";
import {
  reconcilePlatformSubscriptionFromStripe,
  syncPlatformCheckoutSessionById,
} from "@/utils/stripe/sync-subscription";

type DashboardPageProps = {
  searchParams: Promise<{
    paid?: string;
    subscribed?: string;
    canceled?: string;
    session_id?: string;
    project?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const { profile, supabase } = await requireDashboardProfile();

  // After Portal Pro Checkout, sync subscription → trialing/active, then unlock overview.
  if (params.subscribed === "1" && params.session_id) {
    const result = await syncPlatformCheckoutSessionById(params.session_id, {
      freelancerId: profile.id,
      supabase,
    }).catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : "Checkout sync failed.",
    }));

    // Only drop session_id after a successful write so a flaky sync can retry.
    if (result.ok) {
      redirect("/dashboard?subscribed=1");
    }
  }

  // After Stripe Checkout success, sync invoice → paid, then land on Invoices.
  if (params.paid === "1" && params.session_id) {
    await syncCheckoutSessionById(params.session_id);
    redirect("/dashboard/invoices");
  }

  let workingProfile = profile;

  // If Checkout return already cleared session_id (or webhook never fired) but
  // Stripe customer exists while DB still says "none", reconcile once from Stripe.
  const shouldReconcile =
    workingProfile.role === "freelancer" &&
    Boolean(workingProfile.stripe_customer_id) &&
    !isPlatformSubscriptionActive(workingProfile.subscription_status) &&
    (workingProfile.subscription_status === "none" ||
      params.subscribed === "1" ||
      Boolean(params.session_id));

  if (shouldReconcile) {
    const reconciled = await reconcilePlatformSubscriptionFromStripe({
      freelancerId: workingProfile.id,
      stripeCustomerId: workingProfile.stripe_customer_id,
      supabase,
    }).catch(() => ({ ok: false as const }));

    if (reconciled.ok) {
      const { profile: refreshed } = await requireDashboardProfile();
      workingProfile = refreshed;
    }
  } else if (params.subscribed === "1") {
    const { profile: refreshed } = await requireDashboardProfile();
    workingProfile = refreshed;
  }

  const unlocked =
    workingProfile.role !== "freelancer" ||
    freelancerHasWorkspaceAccess(workingProfile);

  const paymentNotice =
    params.canceled === "1"
      ? "Checkout was canceled. Your invoice is still pending."
      : params.subscribed === "1" && unlocked
        ? "You're in. Your free trial is active and the workspace is unlocked."
        : params.subscribed === "1" && !unlocked
          ? "Checkout finished, but we couldn’t confirm your trial yet. Open Billing and tap Refresh subscription, or reload this page."
          : null;

  return (
    <>
      {paymentNotice ? (
        <p
          className={
            params.subscribed === "1" && unlocked
              ? "mb-6 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-900 shadow-sm"
              : "mb-6 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-950 shadow-sm"
          }
        >
          {paymentNotice}
        </p>
      ) : null}
      {workingProfile.role === "freelancer" ? (
        <FreelancerView profile={workingProfile} />
      ) : (
        <ClientView
          profile={workingProfile}
          selectedProjectId={params.project ?? null}
        />
      )}
    </>
  );
}

async function FreelancerView({ profile }: { profile: Profile }) {
  if (!freelancerHasWorkspaceAccess(profile)) {
    return (
      <FreelancerLockedPreview
        title="Overview"
        subtitle="Unlock Portal Pro to run your client workspace"
        email={displayName(profile)}
      />
    );
  }

  const { projects, invoices, deliverables } = await loadFreelancerWorkspace(
    profile.id,
  );

  return (
    <FreelancerDashboard
      profile={profile}
      projects={projects}
      invoices={invoices}
      deliverables={deliverables}
    />
  );
}

async function ClientView({
  profile,
  selectedProjectId,
}: {
  profile: Profile;
  selectedProjectId: string | null;
}) {
  const home = await loadClientWorkspace(profile.id, selectedProjectId);

  return <ClientHome profile={profile} home={home} />;
}
