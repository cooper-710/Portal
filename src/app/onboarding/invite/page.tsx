import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { InviteStepForm } from "@/components/onboarding/invite-step-form";
import { requireOnboardingStep } from "@/app/onboarding/guard";

export default async function OnboardingInvitePage() {
  const { supabase, user } = await requireOnboardingStep("invite");

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, client_email")
    .eq("freelancer_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <OnboardingShell
      step="invite"
      title="Invite your first client"
      description="Send a workspace link by email. They’ll sign in with Google and land in this project."
      hideDefaultActions
    >
      <InviteStepForm projects={projects ?? []} />
    </OnboardingShell>
  );
}
