/**
 * Guided freelancer onboarding — pure step order + skip/resume rules.
 *
 * Step order (before the real app):
 *   welcome → trial → stripe → branding → project → invite → done
 *
 * Clients never enter this flow. After onboarding_completed_at, never show again.
 */

export const ONBOARDING_STEPS = [
  "welcome",
  "trial",
  "stripe",
  "branding",
  "project",
  "invite",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

/** Steps shown in the progress indicator (excludes the final "done" screen). */
export const ONBOARDING_PROGRESS_STEPS = ONBOARDING_STEPS.filter(
  (step) => step !== "done",
);

export type OnboardingProfileSnapshot = {
  role?: "freelancer" | "client" | null;
  subscription_status?: string | null;
  stripe_charges_enabled?: boolean | null;
  portal_setup_completed_at?: string | null;
  business_name?: string | null;
  onboarding_completed_at?: string | null;
  onboarding_step?: string | null;
};

export type OnboardingContext = {
  profile: OnboardingProfileSnapshot;
  /** Freelancer already has ≥1 project. */
  hasProject: boolean;
  /**
   * At least one project has a client_email or client_id
   * (used to auto-skip invite when already invited).
   */
  hasClientInvite?: boolean;
};

export function isOnboardingStep(value: string | null | undefined): value is OnboardingStep {
  return (
    typeof value === "string" &&
    (ONBOARDING_STEPS as readonly string[]).includes(value)
  );
}

export function onboardingPath(step: OnboardingStep) {
  return `/onboarding/${step}`;
}

export function progressForStep(step: OnboardingStep): {
  current: number;
  total: number;
} | null {
  if (step === "done") return null;
  const index = ONBOARDING_PROGRESS_STEPS.indexOf(step);
  if (index < 0) return null;
  return { current: index + 1, total: ONBOARDING_PROGRESS_STEPS.length };
}

/** Whether this step should be auto-skipped given current account state. */
export function shouldAutoSkipStep(
  step: OnboardingStep,
  ctx: OnboardingContext,
): boolean {
  const { profile, hasProject, hasClientInvite = false } = ctx;

  switch (step) {
    case "welcome":
      return false;
    case "trial":
      return (
        profile.subscription_status === "trialing" ||
        profile.subscription_status === "active"
      );
    case "stripe":
      return Boolean(profile.stripe_charges_enabled);
    case "branding":
      return Boolean(
        profile.portal_setup_completed_at || profile.business_name?.trim(),
      );
    case "project":
      return hasProject;
    case "invite":
      // No project yet → nothing to invite; or already invited a client.
      return !hasProject || hasClientInvite;
    case "done":
      return false;
    default:
      return false;
  }
}

export function nextStep(step: OnboardingStep): OnboardingStep | null {
  const index = ONBOARDING_STEPS.indexOf(step);
  if (index < 0 || index >= ONBOARDING_STEPS.length - 1) return null;
  return ONBOARDING_STEPS[index + 1] ?? null;
}

/**
 * Advance past `from` (exclusive), auto-skipping steps that are already done.
 * Returns the next step the user should land on (may be `done`).
 */
export function resolveNextStep(
  from: OnboardingStep,
  ctx: OnboardingContext,
): OnboardingStep {
  let cursor: OnboardingStep | null = nextStep(from);
  while (cursor && shouldAutoSkipStep(cursor, ctx)) {
    if (cursor === "done") break;
    cursor = nextStep(cursor);
  }
  return cursor ?? "done";
}

/**
 * Resume destination for a freelancer who has not finished onboarding.
 * Honors persisted onboarding_step, then auto-skips completed prerequisites.
 */
export function resolveResumeStep(ctx: OnboardingContext): OnboardingStep {
  if (ctx.profile.role !== "freelancer") {
    return "done";
  }
  if (ctx.profile.onboarding_completed_at) {
    return "done";
  }

  const stored = isOnboardingStep(ctx.profile.onboarding_step)
    ? ctx.profile.onboarding_step
    : "welcome";

  if (stored === "done") {
    return "done";
  }

  if (!shouldAutoSkipStep(stored, ctx)) {
    return stored;
  }

  return resolveNextStep(stored, ctx);
}

/** Freelancer still needs the guided wizard (not clients; not completed). */
export function freelancerNeedsOnboarding(profile: OnboardingProfileSnapshot) {
  if (profile.role !== "freelancer") return false;
  if (profile.onboarding_completed_at) return false;
  return true;
}
