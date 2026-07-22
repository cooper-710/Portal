import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { TrialStepForm } from "@/components/onboarding/trial-step-form";
import { requireOnboardingStep } from "@/app/onboarding/guard";
import { PORTAL_PRO_TRIAL_DAYS } from "@/utils/stripe/subscription";

export default async function OnboardingTrialPage() {
  await requireOnboardingStep("trial");

  return (
    <OnboardingShell
      step="trial"
      title="Start your free trial"
      description={`Portal Pro includes projects, client invites, file vault, and invoicing. ${PORTAL_PRO_TRIAL_DAYS} days free, then $25/mo.`}
      hideDefaultActions
    >
      <TrialStepForm />
    </OnboardingShell>
  );
}
