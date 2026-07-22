import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import {
  brandCssVariables,
  businessDisplayName,
  logoPublicUrl,
} from "@/lib/branding";
import {
  loadClientBrand,
  requireDashboardProfile,
} from "@/lib/dashboard-data";
import { displayName } from "@/lib/format";
import { freelancerCanCreate } from "@/utils/stripe/subscription";
import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  freelancerNeedsOnboarding,
  onboardingPath,
  resolveResumeStep,
} from "@/utils/onboarding/steps";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, supabase } = await requireDashboardProfile();
  const canCreate =
    profile.role !== "freelancer" || freelancerCanCreate(profile);

  // Freelancers must finish the guided wizard before the main app chrome.
  if (profile.role === "freelancer" && freelancerNeedsOnboarding(profile)) {
    const ctx = await loadOnboardingContext(supabase, profile.id);
    const step = ctx ? resolveResumeStep(ctx) : "welcome";
    redirect(onboardingPath(step));
  }

  // Already branded without the flag — stamp once so the checklist stays clean.
  if (
    profile.role === "freelancer" &&
    !profile.portal_setup_completed_at &&
    profile.business_name?.trim()
  ) {
    await supabase
      .from("users")
      .update({ portal_setup_completed_at: new Date().toISOString() })
      .eq("id", profile.id);
  }

  const clientBrand =
    profile.role === "client" ? await loadClientBrand(profile.id) : null;

  const brandStyle =
    profile.role === "client" ? brandCssVariables(clientBrand) : undefined;

  const brandLabel =
    profile.role === "client"
      ? businessDisplayName(clientBrand, "Portal")
      : "Portal";

  const brandLogo =
    profile.role === "client" ? logoPublicUrl(clientBrand?.logo_url) : null;

  return (
    <div
      className="min-h-svh bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-50 to-zinc-50"
      style={brandStyle}
    >
      <DashboardNav
        role={profile.role}
        canCreate={canCreate}
        displayLabel={displayName(profile)}
        brandLabel={brandLabel}
        brandLogoUrl={brandLogo}
      />
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
