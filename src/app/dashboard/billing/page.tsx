import { redirect } from "next/navigation";

import { FreelancerBillingPage } from "@/components/dashboard/freelancer-billing-page";
import { requireDashboardProfile } from "@/lib/dashboard-data";
import { getPlatformFeePercent } from "@/utils/stripe/application-fee";
import { FINALIA_PRO_TRIAL_DAYS } from "@/utils/stripe/subscription";
import { syncPlatformCheckoutSessionById } from "@/utils/stripe/sync-subscription";

type BillingPageProps = {
  searchParams: Promise<{
    subscribed?: string;
    canceled?: string;
    session_id?: string;
  }>;
};

export default async function DashboardBillingPage({
  searchParams,
}: BillingPageProps) {
  const params = await searchParams;
  const { profile, supabase } = await requireDashboardProfile();

  if (profile.role !== "freelancer") {
    redirect("/dashboard");
  }

  // Legacy success_url landed here, sync then send to the working overview.
  if (params.subscribed === "1" && params.session_id) {
    const result = await syncPlatformCheckoutSessionById(params.session_id, {
      freelancerId: profile.id,
      supabase,
    }).catch((error: unknown) => ({
      ok: false as const,
      error: error instanceof Error ? error.message : "Checkout sync failed.",
    }));

    if (result.ok) {
      redirect("/dashboard?subscribed=1");
    }
    // Keep session_id in the URL so a refresh can retry; fall through to Billing UI.
  }

  if (params.subscribed === "1") {
    redirect("/dashboard?subscribed=1");
  }

  let notice: string | null = null;
  if (params.canceled === "1") {
    notice = `Checkout was canceled. Start a ${FINALIA_PRO_TRIAL_DAYS}-day free trial anytime to unlock Finalia Pro.`;
  }

  const { profile: freshProfile } = await requireDashboardProfile();

  return (
    <FreelancerBillingPage
      profile={freshProfile}
      notice={notice}
      platformFeePercent={getPlatformFeePercent()}
    />
  );
}
