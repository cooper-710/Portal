import { redirect } from "next/navigation";

import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  freelancerNeedsOnboarding,
  onboardingPath,
  resolveResumeStep,
} from "@/utils/onboarding/steps";
import { createClient } from "@/utils/supabase/server";

/** /onboarding → resume the correct step (or dashboard if done). */
export default async function OnboardingIndexPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=signin&next=/onboarding");
  }

  const ctx = await loadOnboardingContext(supabase, user.id);
  if (!ctx || ctx.profile.role !== "freelancer") {
    redirect("/dashboard");
  }

  if (!freelancerNeedsOnboarding(ctx.profile)) {
    redirect("/dashboard");
  }

  const step = resolveResumeStep(ctx);
  if (ctx.profile.onboarding_step !== step) {
    await supabase
      .from("users")
      .update({ onboarding_step: step })
      .eq("id", user.id);
  }

  redirect(onboardingPath(step));
}
