/**
 * Platform application fee for Connect destination charges (client invoice payments).
 *
 * Env:
 * - STRIPE_PLATFORM_FEE_PERCENT, percent of invoice (e.g. "1" = 1%). Default 1 when unset.
 * - STRIPE_PLATFORM_FEE_FLAT_CENTS, optional flat fee in cents added on top (e.g. "500" = $5).
 *
 * Fee is always at least 1¢ when the invoice is large enough, and never >= charge amount
 * (freelancer receives at least 1¢).
 */

/** Default percent when STRIPE_PLATFORM_FEE_PERCENT is unset (and no flat-only mode). */
export const DEFAULT_PLATFORM_FEE_PERCENT = 1;

/**
 * Effective percent used for Connect application fees (and Billing UI copy).
 * Returns DEFAULT_PLATFORM_FEE_PERCENT when the env is unset and no flat fee is configured.
 */
export function getPlatformFeePercent(): number {
  const percentRaw = process.env.STRIPE_PLATFORM_FEE_PERCENT;
  const flatRaw = process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;

  if (percentRaw === undefined || percentRaw === "") {
    if (flatRaw !== undefined && flatRaw !== "") return 0;
    return DEFAULT_PLATFORM_FEE_PERCENT;
  }

  const percent = Number(percentRaw);
  return Number.isFinite(percent) && percent > 0 ? percent : 0;
}

export function calculatePlatformApplicationFeeCents(invoiceAmountCents: number) {
  if (!Number.isFinite(invoiceAmountCents) || invoiceAmountCents <= 0) {
    return 0;
  }

  const flatRaw = process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;
  const flatCents =
    flatRaw === undefined || flatRaw === "" ? 0 : Number(flatRaw);

  const safePercent = getPlatformFeePercent();
  const safeFlat =
    Number.isFinite(flatCents) && flatCents > 0 ? Math.round(flatCents) : 0;

  const percentFee = Math.round((invoiceAmountCents * safePercent) / 100);
  let fee = percentFee + safeFlat;

  // Leave at least $0.01 for the connected account.
  const maxFee = Math.max(invoiceAmountCents - 1, 0);
  fee = Math.min(Math.max(fee, 0), maxFee);

  return fee;
}
