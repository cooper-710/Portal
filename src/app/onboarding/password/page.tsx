import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SetPasswordForm } from "./set-password-form";
import { loadOnboardingContext } from "@/utils/onboarding/load-context";
import {
  freelancerNeedsOnboarding,
  onboardingPath,
  resolveResumeStep,
} from "@/utils/onboarding/steps";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function SetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let nextPath = params.next?.startsWith("/") ? params.next : "/dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/?auth=signin&next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select(
      "password_set, full_name, role, onboarding_completed_at, onboarding_step",
    )
    .eq("id", user.id)
    .maybeSingle();

  // Workspace owners still in the wizard → resume onboarding after password.
  if (
    profile?.role === "freelancer" &&
    freelancerNeedsOnboarding(profile) &&
    (nextPath === "/dashboard" ||
      nextPath === "/dashboard/" ||
      nextPath.startsWith("/dashboard/billing"))
  ) {
    const ctx = await loadOnboardingContext(supabase, user.id);
    nextPath = onboardingPath(ctx ? resolveResumeStep(ctx) : "welcome");
  }

  if (profile?.password_set) {
    redirect(nextPath);
  }

  const metaName =
    typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  const headingToTrial =
    profile?.role === "freelancer" &&
    freelancerNeedsOnboarding(profile) &&
    nextPath.includes("/onboarding/trial");

  return (
    <Suspense
      fallback={
        <main className="flex min-h-svh items-center justify-center bg-zinc-50 text-sm text-muted-foreground">
          Loading…
        </main>
      }
    >
      <SetPasswordForm
        initialFullName={profile?.full_name ?? metaName ?? ""}
        nextPath={nextPath}
        headingToTrial={headingToTrial}
      />
    </Suspense>
  );
}
