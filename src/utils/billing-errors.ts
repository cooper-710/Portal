/**
 * Map API / network failures to short, user-facing billing messages.
 * Avoid leaking raw Stripe / infra details when possible.
 */
export function friendlyBillingError(
  message: string | null | undefined,
  fallback = "Something went wrong. Please try again in a moment.",
): string {
  const raw = (message ?? "").trim();
  if (!raw) return fallback;

  const lower = raw.toLowerCase();

  if (
    lower.includes("not configured") ||
    lower.includes("stripe_saas_price") ||
    lower.includes("stripe_secret") ||
    lower.includes("stripe is not configured")
  ) {
    return "Billing is temporarily unavailable. Please try again later or contact support.";
  }

  if (lower.includes("unauthorized") || lower.includes("not authenticated")) {
    return "Please sign in again, then retry billing.";
  }

  if (lower.includes("already have an active subscription")) {
    return "You already have an active plan. Open Manage billing to make changes.";
  }

  if (lower.includes("only freelancers")) {
    return "Only freelancer accounts can subscribe to Portal Pro.";
  }

  if (lower.includes("connect") && lower.includes("stripe")) {
    return "This freelancer has not finished connecting payouts yet. Ask them to complete Stripe Connect.";
  }

  if (lower.includes("already paid")) {
    return "This invoice is already paid.";
  }

  if (lower.includes("network") || lower.includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }

  // Keep short Stripe user-facing errors; truncate noisy internals.
  if (raw.length > 180 || lower.includes("request_id") || lower.includes("stack")) {
    return fallback;
  }

  return raw;
}

export function friendlyCheckoutError(message: string | null | undefined) {
  return friendlyBillingError(
    message,
    "Unable to start checkout. Please try again, or contact the freelancer if this continues.",
  );
}
