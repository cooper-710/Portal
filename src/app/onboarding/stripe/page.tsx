import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { StripeStepForm } from "@/components/onboarding/stripe-step-form";
import { requireOnboardingStep } from "@/app/onboarding/guard";

export default async function OnboardingStripePage() {
  await requireOnboardingStep("stripe");

  return (
    <OnboardingShell
      step="stripe"
      title="Connect Stripe"
      description="Get paid directly to your bank when clients pay invoices. Takes a few minutes (you can finish later)."
      hideDefaultActions
    >
      <StripeStepForm />
    </OnboardingShell>
  );
}
