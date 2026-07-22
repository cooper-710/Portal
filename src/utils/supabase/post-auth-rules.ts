/**
 * Pure post-auth redirect rules (no Supabase). Used by resolvePostAuthPath and tests.
 *
 * Freelancer path order:
 *   password (legacy email) → guided onboarding wizard → dashboard
 * Clients → dashboard (or requested next). Never enter freelancer onboarding.
 */

function isGenericDashboard(path: string) {
  return path === "/dashboard" || path === "/dashboard/";
}

/** Post-auth default billing landing (not deep links under other routes). */
function isBillingLanding(path: string) {
  return (
    path === "/dashboard/billing" || path.startsWith("/dashboard/billing?")
  );
}

function isOnboardingPath(path: string) {
  return path === "/onboarding" || path.startsWith("/onboarding/");
}

export type PostAuthRole = "freelancer" | "client" | null | undefined;

export type PostAuthRulesInput = {
  nextPath?: string;
  role: PostAuthRole;
  passwordSet: boolean;
  /** Freelancer still needs the guided onboarding wizard. */
  needsOnboarding?: boolean;
  /** Resume path inside /onboarding/... when needsOnboarding. */
  onboardingPath?: string;
};

/**
 * Decide where a signed-in user should land after auth confirm/callback.
 * Password onboarding wraps the destination when password is not set.
 */
export function resolvePostAuthDestination({
  nextPath = "/dashboard",
  role,
  passwordSet,
  needsOnboarding = false,
  onboardingPath = "/onboarding/welcome",
}: PostAuthRulesInput): string {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  let destination = safeNext;

  if (role === "freelancer") {
    // New freelancers go through the full-screen wizard, not locked dashboard FOMO.
    // Always resume the persisted step (ignore generic /onboarding/welcome next from auth).
    if (needsOnboarding) {
      destination = onboardingPath.startsWith("/onboarding")
        ? onboardingPath
        : "/onboarding/welcome";
    } else if (isBillingLanding(safeNext) || isGenericDashboard(safeNext)) {
      destination = "/dashboard";
    } else if (isOnboardingPath(safeNext)) {
      // Completed onboarding but next still points at wizard → dashboard.
      destination = "/dashboard";
    }
  }

  if (!passwordSet) {
    return `/onboarding/password?next=${encodeURIComponent(destination)}`;
  }

  return destination;
}

/** @deprecated Prefer freelancerNeedsOnboarding, kept for settings/branding checks. */
export function freelancerNeedsPortalSetup(profile: {
  role?: PostAuthRole;
  portal_setup_completed_at?: string | null;
  business_name?: string | null;
}) {
  if (profile.role !== "freelancer") return false;
  if (profile.portal_setup_completed_at) return false;
  if (profile.business_name?.trim()) return false;
  return true;
}
