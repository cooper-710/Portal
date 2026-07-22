/**
 * Platform application fee for Connect destination charges (client invoice payments).
 *
 * Env:
 * - STRIPE_PLATFORM_FEE_PERCENT — percent of invoice (e.g. "1" = 1%). Default 1 when unset.
 * - STRIPE_PLATFORM_FEE_FLAT_CENTS — optional flat fee in cents added on top (e.g. "500" = $5).
 *
 * Fee is always at least 1¢ when the invoice is large enough, and never >= charge amount
 * (freelancer receives at least 1¢).
 */
export function calculatePlatformApplicationFeeCents(invoiceAmountCents: number) {
  if (!Number.isFinite(invoiceAmountCents) || invoiceAmountCents <= 0) {
    return 0;
  }

  const percentRaw = process.env.STRIPE_PLATFORM_FEE_PERCENT;
  const flatRaw = process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;

  const percent =
    percentRaw === undefined || percentRaw === ""
      ? flatRaw
        ? 0
        : 1
      : Number(percentRaw);
  const flatCents =
    flatRaw === undefined || flatRaw === "" ? 0 : Number(flatRaw);

  const safePercent = Number.isFinite(percent) && percent > 0 ? percent : 0;
  const safeFlat =
    Number.isFinite(flatCents) && flatCents > 0 ? Math.round(flatCents) : 0;

  const percentFee = Math.round((invoiceAmountCents * safePercent) / 100);
  let fee = percentFee + safeFlat;

  // Leave at least $0.01 for the connected account.
  const maxFee = Math.max(invoiceAmountCents - 1, 0);
  fee = Math.min(Math.max(fee, 0), maxFee);

  return fee;
}
