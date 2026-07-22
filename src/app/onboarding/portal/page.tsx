import { redirect } from "next/navigation";

/**
 * Legacy customize-portal route, folded into the guided wizard.
 */
export default async function LegacyPortalSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  await searchParams;
  redirect("/onboarding/branding");
}
