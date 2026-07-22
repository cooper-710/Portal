import { afterEach, describe, expect, it } from "vitest";

import { calculatePlatformApplicationFeeCents } from "../src/utils/stripe/application-fee";

describe("calculatePlatformApplicationFeeCents", () => {
  const originalPercent = process.env.STRIPE_PLATFORM_FEE_PERCENT;
  const originalFlat = process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;

  afterEach(() => {
    if (originalPercent === undefined) {
      delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
    } else {
      process.env.STRIPE_PLATFORM_FEE_PERCENT = originalPercent;
    }
    if (originalFlat === undefined) {
      delete process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;
    } else {
      process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS = originalFlat;
    }
  });

  it("defaults to ~1% when env is unset", () => {
    delete process.env.STRIPE_PLATFORM_FEE_PERCENT;
    delete process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;
    expect(calculatePlatformApplicationFeeCents(10_000)).toBe(100);
  });

  it("returns 0 for non-positive amounts", () => {
    expect(calculatePlatformApplicationFeeCents(0)).toBe(0);
    expect(calculatePlatformApplicationFeeCents(-50)).toBe(0);
  });

  it("never takes the full charge (leaves at least 1¢)", () => {
    process.env.STRIPE_PLATFORM_FEE_PERCENT = "100";
    delete process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS;
    expect(calculatePlatformApplicationFeeCents(100)).toBe(99);
  });

  it("adds flat fee on top of percent", () => {
    process.env.STRIPE_PLATFORM_FEE_PERCENT = "1";
    process.env.STRIPE_PLATFORM_FEE_FLAT_CENTS = "50";
    // 1% of 10000 = 100 + 50 flat = 150
    expect(calculatePlatformApplicationFeeCents(10_000)).toBe(150);
  });
});
