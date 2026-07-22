import type { CSSProperties } from "react";

import type { BusinessBrand, BrandAppearance } from "@/types/database";
import { displayName } from "@/lib/format";

export const DEFAULT_BRAND_PRIMARY = "#2563eb";
export const DEFAULT_BRAND_ACCENT = "#0ea5e9";

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

export function normalizeHexColor(
  value: string | null | undefined,
  fallback: string,
) {
  const trimmed = value?.trim() ?? "";
  if (HEX_RE.test(trimmed)) return trimmed.toLowerCase();
  return fallback;
}

export function businessDisplayName(
  brand:
    | Pick<BusinessBrand, "business_name" | "full_name" | "email">
    | null
    | undefined,
  fallback = "Portal",
) {
  const business = brand?.business_name?.trim();
  if (business) return business;
  return displayName(brand, fallback) || fallback;
}

export function logoPublicUrl(logoPath: string | null | undefined) {
  if (!logoPath) return null;
  if (logoPath.startsWith("http://") || logoPath.startsWith("https://")) {
    return logoPath;
  }
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/business-logos/${logoPath}`;
}

export function hasWorkspaceBranding(
  brand:
    | Pick<
        BusinessBrand,
        "business_name" | "logo_url" | "brand_primary" | "brand_accent"
      >
    | null
    | undefined,
) {
  if (!brand) return false;
  return Boolean(
    brand.business_name?.trim() ||
      brand.logo_url ||
      brand.brand_primary ||
      brand.brand_accent,
  );
}

export function brandCssVariables(brand: BusinessBrand | null | undefined): CSSProperties {
  const primary = normalizeHexColor(brand?.brand_primary, DEFAULT_BRAND_PRIMARY);
  const accent = normalizeHexColor(brand?.brand_accent, DEFAULT_BRAND_ACCENT);

  return {
    "--brand-primary": primary,
    "--brand-accent": accent,
    "--brand-primary-soft": `${primary}14`,
    "--brand-accent-soft": `${accent}14`,
    // Align shadcn primary buttons / focus rings with workspace brand.
    "--primary": primary,
    "--ring": primary,
  } as CSSProperties;
}

export function isValidAppearance(
  value: string,
): value is BrandAppearance {
  return value === "light" || value === "default";
}
