import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/dashboard/dashboard-nav";
import { SiteFooter } from "@/components/site-footer";
import {
  brandCssVariables,
  businessDisplayName,
  hasWorkspaceBranding,
  logoPublicUrl,
} from "@/lib/branding";
import {
  loadClientBrand,
  requireDashboardProfile,
} from "@/lib/dashboard-data";
import { displayName } from "@/lib/format";
import type { BusinessBrand } from "@/types/database";
import { freelancerCanCreate } from "@/utils/stripe/subscription";
import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  freelancerNeedsOnboarding,
  onboardingPath,
  resolveResumeStep,
} from "@/utils/onboarding/steps";

function profileAsBrand(profile: {
  email: string;
  full_name: string | null;
  business_name: string | null;
  logo_url: string | null;
  brand_primary: string | null;
  brand_accent: string | null;
  welcome_message: string | null;
  appearance: BusinessBrand["appearance"];
}): BusinessBrand {
  return {
    email: profile.email,
    full_name: profile.full_name,
    business_name: profile.business_name,
    logo_url: profile.logo_url,
    brand_primary: profile.brand_primary,
    brand_accent: profile.brand_accent,
    welcome_message: profile.welcome_message,
    appearance: profile.appearance,
  };
}

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

  // Already branded without the flag, stamp once so the checklist stays clean.
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

  // Clients always inherit the owner's brand. Owners see their own brand in
  // chrome once they have customized workspace branding; otherwise use Finalia.
  const workspaceBrand =
    profile.role === "client"
      ? await loadClientBrand(profile.id)
      : hasWorkspaceBranding(profile)
        ? profileAsBrand(profile)
        : null;

  const brandStyle =
    workspaceBrand || profile.role === "client"
      ? brandCssVariables(workspaceBrand)
      : undefined;

  const brandLabel = workspaceBrand
    ? businessDisplayName(workspaceBrand, "Finalia")
    : "Finalia";

  const brandLogo = logoPublicUrl(workspaceBrand?.logo_url);

  return (
    <div
      className="flex min-h-svh flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-100 via-zinc-50 to-zinc-50"
      style={brandStyle}
    >
      <DashboardNav
        userId={profile.id}
        role={profile.role}
        canCreate={canCreate}
        displayLabel={displayName(profile)}
        brandLabel={brandLabel}
        brandLogoUrl={brandLogo}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        {children}
      </main>
      <SiteFooter variant="app" />
    </div>
  );
}
