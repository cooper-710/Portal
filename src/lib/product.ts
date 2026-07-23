export const PRODUCT_NAME = "Finalia";
export const PRODUCT_PLAN_NAME = "Finalia Pro";
export const PRODUCTION_APP_URL = "https://finalia.app";
export const LOCAL_APP_URL = "http://localhost:3001";

export function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return process.env.NODE_ENV === "production"
    ? PRODUCTION_APP_URL
    : LOCAL_APP_URL;
}
