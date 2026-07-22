import type { Profile, PlatformSubscriptionStatus } from "@/types/database";

/**
 * Free trial length for new Portal Pro subscriptions (Stripe Checkout).
 * Checkout does not support Stripe Trial Offers (`to_…`); use trial_period_days.
 * STRIPE_TRIAL_OFFER_ID is kept in env for Dashboard/API reference only.
 */
function resolvePortalProTrialDays(): number {
  const raw = process.env.PORTAL_PRO_TRIAL_DAYS;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 14;
}

export const PORTAL_PRO_TRIAL_DAYS = resolvePortalProTrialDays();

/** Stripe Trial Offer ID from Dashboard (not attachable via Checkout Sessions). */
export const STRIPE_TRIAL_OFFER_ID =
  process.env.STRIPE_TRIAL_OFFER_ID?.trim() || null;

export function isPlatformSubscriptionActive(
  status: PlatformSubscriptionStatus | string | null | undefined,
) {
  return status === "active" || status === "trialing";
}

/**
 * Working-product access: freelancers need active paid OR trialing subscription.
 * Clients are always allowed (no SaaS subscription required).
 */
export function freelancerHasWorkspaceAccess(
  profile: Pick<Profile, "role" | "subscription_status">,
) {
  if (profile.role !== "freelancer") {
    return true;
  }
  return isPlatformSubscriptionActive(profile.subscription_status);
}

/** Same rule as workspace access — create/invite/upload require trial or paid. */
export function freelancerCanCreate(
  profile: Pick<Profile, "role" | "subscription_status">,
) {
  return freelancerHasWorkspaceAccess(profile);
}

export function formatSubscriptionStatus(status: PlatformSubscriptionStatus) {
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Free trial";
    case "past_due":
      return "Past due";
    case "canceled":
      return "Canceled";
    case "incomplete":
      return "Incomplete";
    case "incomplete_expired":
      return "Expired";
    case "unpaid":
      return "Unpaid";
    case "paused":
      return "Paused";
    case "none":
    default:
      return "No plan";
  }
}
