import { describe, expect, it } from "vitest";

import {
  DEFAULT_BRAND_ACCENT,
  DEFAULT_BRAND_PRIMARY,
  brandCssVariables,
  hasWorkspaceBranding,
  normalizeHexColor,
} from "../src/lib/branding";

describe("normalizeHexColor", () => {
  it("accepts valid hex and lowercases", () => {
    expect(normalizeHexColor("#AABBCC", DEFAULT_BRAND_PRIMARY)).toBe("#aabbcc");
  });

  it("falls back on invalid values", () => {
    expect(normalizeHexColor("blue", DEFAULT_BRAND_PRIMARY)).toBe(
      DEFAULT_BRAND_PRIMARY,
    );
    expect(normalizeHexColor("#fff", DEFAULT_BRAND_ACCENT)).toBe(
      DEFAULT_BRAND_ACCENT,
    );
  });
});

describe("hasWorkspaceBranding", () => {
  it("is false when nothing is customized", () => {
    expect(hasWorkspaceBranding(null)).toBe(false);
    expect(
      hasWorkspaceBranding({
        business_name: null,
        logo_url: null,
        brand_primary: null,
        brand_accent: null,
      }),
    ).toBe(false);
    expect(
      hasWorkspaceBranding({
        business_name: "  ",
        logo_url: null,
        brand_primary: null,
        brand_accent: null,
      }),
    ).toBe(false);
  });

  it("is true when any brand field is set", () => {
    expect(
      hasWorkspaceBranding({
        business_name: "River Studio",
        logo_url: null,
        brand_primary: null,
        brand_accent: null,
      }),
    ).toBe(true);
    expect(
      hasWorkspaceBranding({
        business_name: null,
        logo_url: "user/logo.png",
        brand_primary: null,
        brand_accent: null,
      }),
    ).toBe(true);
    expect(
      hasWorkspaceBranding({
        business_name: null,
        logo_url: null,
        brand_primary: "#112233",
        brand_accent: null,
      }),
    ).toBe(true);
  });
});

describe("brandCssVariables", () => {
  it("emits CSS custom properties for primary and accent", () => {
    const vars = brandCssVariables({
      business_name: "Studio",
      logo_url: null,
      brand_primary: "#112233",
      brand_accent: "#445566",
      welcome_message: null,
      appearance: "light",
      full_name: null,
      email: "a@b.com",
    });

    expect(vars).toMatchObject({
      "--brand-primary": "#112233",
      "--brand-accent": "#445566",
      "--brand-primary-soft": "#11223314",
      "--brand-accent-soft": "#44556614",
      "--primary": "#112233",
      "--ring": "#112233",
    });
  });

  it("uses defaults when brand is missing", () => {
    const vars = brandCssVariables(null);
    expect(vars["--brand-primary" as keyof typeof vars]).toBe(
      DEFAULT_BRAND_PRIMARY,
    );
    expect(vars["--brand-accent" as keyof typeof vars]).toBe(
      DEFAULT_BRAND_ACCENT,
    );
  });
});
