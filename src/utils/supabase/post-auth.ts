import {
  freelancerNeedsOnboarding,
  onboardingPath,
  resolveResumeStep,
} from "@/utils/onboarding/steps";
import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  syncOAuthProfile,
  type PreferredSignupRole,
} from "@/utils/supabase/oauth-profile";
import { resolvePostAuthDestination } from "@/utils/supabase/post-auth-rules";
import { createClient } from "@/utils/supabase/server";

export type ResolvePostAuthOptions = {
  /** From login `?role=client` / OAuth redirect, applied on first Google signup. */
  preferredRole?: PreferredSignupRole | null;
};

/**
 * After magic-link / OTP / password / OAuth sign-in:
 * 1. OAuth users → password_set + full_name sync (skip password onboarding)
 * 2. Users without a password → onboarding password setup
 * 3. Freelancers without onboarding_completed_at → guided /onboarding/... (resume)
 * 4. Clients → dashboard (or their requested next)
 */
export async function resolvePostAuthPath(
  nextPath = "/dashboard",
  options: ResolvePostAuthOptions = {},
) {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return `/?auth=signin&next=${encodeURIComponent(safeNext)}`;
  }

  await syncOAuthProfile(supabase, user, options.preferredRole);

  // Attach any projects invited to this email (pending client_email).
  if (user.email) {
    await supabase.rpc("link_projects_for_client", {
      p_user_id: user.id,
      p_email: user.email,
    });
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "password_set, role, subscription_status, portal_setup_completed_at, business_name, onboarding_completed_at, onboarding_step, stripe_charges_enabled",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Existing branding without the flag, stamp complete so we don't re-check forever.
  if (
    profile?.role === "freelancer" &&
    !profile.portal_setup_completed_at &&
    profile.business_name?.trim()
  ) {
    await supabase
      .from("users")
      .update({ portal_setup_completed_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  let needsOnboarding = false;
  let resumeOnboardingPath = "/onboarding/welcome";

  if (profile?.role === "freelancer" && freelancerNeedsOnboarding(profile)) {
    needsOnboarding = true;
    const ctx = await loadOnboardingContext(supabase, user.id);
    if (ctx) {
      const step = resolveResumeStep(ctx);
      resumeOnboardingPath = onboardingPath(step);
      // Persist resume cursor so refresh stays consistent.
      if (ctx.profile.onboarding_step !== step) {
        await supabase
          .from("users")
          .update({ onboarding_step: step })
          .eq("id", user.id);
      }
    }
  }

  return resolvePostAuthDestination({
    nextPath: safeNext,
    role: profile?.role,
    passwordSet: Boolean(profile?.password_set),
    needsOnboarding,
    onboardingPath: resumeOnboardingPath,
  });
}
