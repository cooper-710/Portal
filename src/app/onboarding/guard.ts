import { redirect } from "next/navigation";

import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  freelancerNeedsOnboarding,
  isOnboardingStep,
  onboardingPath,
  resolveResumeStep,
  shouldAutoSkipStep,
  type OnboardingStep,
} from "@/utils/onboarding/steps";
import { createClient } from "@/utils/supabase/server";

/**
 * Guard a nested onboarding step page.
 * Ensures freelancer + incomplete onboarding, persists resume cursor,
 * and redirects if this step should be auto-skipped.
 */
export async function requireOnboardingStep(expected: OnboardingStep) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?auth=signin&next=${encodeURIComponent(onboardingPath(expected))}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("password_set, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/?auth=signin");
  }

  if (profile.role !== "freelancer") {
    redirect("/dashboard");
  }

  if (!profile.password_set) {
    redirect(
      `/onboarding/password?next=${encodeURIComponent(onboardingPath(expected))}`,
    );
  }

  const ctx = await loadOnboardingContext(supabase, user.id);
  if (!ctx || !freelancerNeedsOnboarding(ctx.profile)) {
    redirect("/dashboard");
  }

  const resume = resolveResumeStep(ctx);

  // Persist cursor when it drifted.
  if (ctx.profile.onboarding_step !== resume) {
    await supabase
      .from("users")
      .update({ onboarding_step: resume })
      .eq("id", user.id);
  }

  // Visiting a future/past step → snap to resume.
  if (expected !== resume) {
    // Allow landing on done when resume is done.
    if (!(expected === "done" && resume === "done")) {
      // If user somehow hits an auto-skipped step URL, bounce forward.
      if (shouldAutoSkipStep(expected, ctx) || expected !== resume) {
        redirect(onboardingPath(resume));
      }
    }
  }

  if (shouldAutoSkipStep(expected, ctx) && expected !== "done") {
    redirect(onboardingPath(resume));
  }

  return { user, supabase, ctx, step: expected };
}

export function assertStep(param: string): OnboardingStep {
  if (!isOnboardingStep(param)) {
    redirect("/onboarding");
  }
  return param;
}
