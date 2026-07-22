import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { BrandingStepForm } from "@/components/onboarding/branding-step-form";
import { requireOnboardingStep } from "@/app/onboarding/guard";
import type { Profile } from "@/types/database";

export default async function OnboardingBrandingPage() {
  const { supabase, user } = await requireOnboardingStep("branding");

  const { data: profileRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const profile = profileRow as Profile;

  return (
    <OnboardingShell
      step="branding"
      title="Customize your portal"
      description="Give clients a branded first impression. You can change this anytime in Settings."
      hideDefaultActions
    >
      <BrandingStepForm profile={profile} />
    </OnboardingShell>
  );
}
