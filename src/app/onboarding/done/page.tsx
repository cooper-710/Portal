import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { requireOnboardingStep } from "@/app/onboarding/guard";

export default async function OnboardingDonePage() {
  await requireOnboardingStep("done");

  return (
    <OnboardingShell
      step="done"
      title="You’re ready"
      description="Your client workspace is set up. Jump into the dashboard to manage projects, files, and invoices."
      continueLabel="Enter dashboard"
      isFinal
    />
  );
}
