/**
 * Pure post-auth redirect rules (no Supabase). Used by resolvePostAuthPath and tests.
 *
 * Freelancer path order:
 *   password → billing/trial (if no access) → customize portal → dashboard
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

function isPortalOnboarding(path: string) {
  return (
    path === "/onboarding/portal" || path.startsWith("/onboarding/portal?")
  );
}

export type PostAuthRole = "freelancer" | "client" | null | undefined;

export type PostAuthRulesInput = {
  nextPath?: string;
  role: PostAuthRole;
  passwordSet: boolean;
  /** Freelancer has Portal Pro access (trialing / active). */
  hasWorkspaceAccess: boolean;
  /** Freelancer still needs the one-time customize-portal step. */
  needsPortalSetup?: boolean;
};

/**
 * Decide where a signed-in user should land after auth confirm/callback.
 * Password onboarding wraps the destination when password is not set.
 */
export function resolvePostAuthDestination({
  nextPath = "/dashboard",
  role,
  passwordSet,
  hasWorkspaceAccess,
  needsPortalSetup = false,
}: PostAuthRulesInput): string {
  const safeNext = nextPath.startsWith("/") ? nextPath : "/dashboard";
  let destination = safeNext;

  if (role === "freelancer") {
    if (!hasWorkspaceAccess && isGenericDashboard(safeNext)) {
      destination = "/dashboard/billing";
    } else if (hasWorkspaceAccess && isBillingLanding(safeNext)) {
      destination = "/dashboard";
    }

    // After trial unlock (or returning freelancers with access), customize once.
    if (
      hasWorkspaceAccess &&
      needsPortalSetup &&
      !isPortalOnboarding(destination) &&
      !isBillingLanding(destination)
    ) {
      destination = `/onboarding/portal?next=${encodeURIComponent(
        isGenericDashboard(destination) ? "/dashboard" : destination,
      )}`;
    }
  }

  if (!passwordSet) {
    return `/onboarding/password?next=${encodeURIComponent(destination)}`;
  }

  return destination;
}

/** Whether a freelancer should see the customize-portal onboarding step. */
export function freelancerNeedsPortalSetup(profile: {
  role?: PostAuthRole;
  portal_setup_completed_at?: string | null;
  business_name?: string | null;
}) {
  if (profile.role !== "freelancer") return false;
  if (profile.portal_setup_completed_at) return false;
  // Already branded in settings → treat as complete (no wizard).
  if (profile.business_name?.trim()) return false;
  return true;
}
