import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { requireOnboardingStep } from "@/app/onboarding/guard";

export default async function OnboardingWelcomePage() {
  await requireOnboardingStep("welcome");

  return (
    <OnboardingShell
      step="welcome"
      title="Welcome to Portal"
      description="One private workspace per project. Invite clients, share deliverables, and get paid without inbox chaos."
      continueLabel="Continue"
      allowSkip
      skipLabel="Skip intro"
    />
  );
}
