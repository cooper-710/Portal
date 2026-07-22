import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { ProjectStepForm } from "@/components/onboarding/project-step-form";
import { requireOnboardingStep } from "@/app/onboarding/guard";

export default async function OnboardingProjectPage() {
  await requireOnboardingStep("project");

  return (
    <OnboardingShell
      step="project"
      title="Create your first project"
      description="A project is the private workspace you’ll share with a client. You can invite them next."
      hideDefaultActions
    >
      <ProjectStepForm />
    </OnboardingShell>
  );
}
