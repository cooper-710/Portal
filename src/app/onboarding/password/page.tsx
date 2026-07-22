import { Suspense } from "react";
import { redirect } from "next/navigation";

import { SetPasswordForm } from "./set-password-form";
import { freelancerHasWorkspaceAccess } from "@/utils/stripe/subscription";
import { createClient } from "@/utils/supabase/server";

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

function isGenericDashboard(path: string) {
  return path === "/dashboard" || path === "/dashboard/";
}

function isBillingLanding(path: string) {
  return (
    path === "/dashboard/billing" || path.startsWith("/dashboard/billing?")
  );
}

export default async function SetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  let nextPath = params.next?.startsWith("/") ? params.next : "/dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("password_set, full_name, role, subscription_status")
    .eq("id", user.id)
    .maybeSingle();

  // Match resolvePostAuthPath: no access → billing; trialing/active → dashboard.
  if (profile?.role === "freelancer") {
    const hasAccess = freelancerHasWorkspaceAccess({
      role: profile.role,
      subscription_status: profile.subscription_status,
    });
    if (!hasAccess && isGenericDashboard(nextPath)) {
      nextPath = "/dashboard/billing";
    } else if (hasAccess && isBillingLanding(nextPath)) {
      nextPath = "/dashboard";
    }
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
    !freelancerHasWorkspaceAccess({
      role: profile.role,
      subscription_status: profile.subscription_status,
    }) &&
    isBillingLanding(nextPath);

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
