import { redirect } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";

import { PortalSetupForm } from "./portal-setup-form";
import type { Profile } from "@/types/database";
import { freelancerHasWorkspaceAccess } from "@/utils/stripe/subscription";
import { freelancerNeedsPortalSetup } from "@/utils/supabase/post-auth-rules";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Customize your portal",
  robots: { index: false, follow: false },
};

type PageProps = {
  searchParams: Promise<{ next?: string }>;
};

export default async function PortalSetupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/dashboard";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent("/onboarding/portal")}`);
  }

  const { data: profileRow } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profileRow) {
    redirect("/login");
  }

  const profile = profileRow as Profile;

  if (profile.role !== "freelancer") {
    redirect(nextPath);
  }

  if (!profile.password_set) {
    redirect(
      `/onboarding/password?next=${encodeURIComponent("/onboarding/portal")}`,
    );
  }

  if (!freelancerHasWorkspaceAccess(profile)) {
    redirect("/dashboard/billing");
  }

  // Already done (or branded) — don't loop.
  if (!freelancerNeedsPortalSetup(profile)) {
    if (!profile.portal_setup_completed_at && profile.business_name?.trim()) {
      await supabase
        .from("users")
        .update({ portal_setup_completed_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    redirect(nextPath);
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="mb-8 max-w-md text-center">
        <Link
          href="/"
          className="text-2xl font-semibold tracking-tight text-zinc-900"
        >
          Portal
        </Link>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-zinc-900">
          Customize your client portal
        </h1>
        <p className="mt-2 text-sm text-zinc-500">
          Give clients a branded first impression. You can change this anytime
          in Settings.
        </p>
      </div>

      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
        <PortalSetupForm profile={profile} nextPath={nextPath} />
      </div>
    </main>
  );
}
