"use client";

import Link from "next/link";
import { ArrowUpRight, CreditCard, Wallet } from "lucide-react";

import { signOut } from "@/app/actions";
import { BrandingForm } from "@/components/dashboard/branding-form";
import { ChangePasswordForm } from "@/components/dashboard/change-password-form";
import { DeleteAccountForm } from "@/components/dashboard/delete-account-form";
import { ProfileNameForm } from "@/components/dashboard/profile-name-form";
import { NotificationPreferencesForm } from "@/components/dashboard/notification-preferences";
import { StripeConnectBanner } from "@/components/dashboard/stripe-connect-banner";
import { Button, buttonVariants } from "@/components/ui/button";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import {
  formatSubscriptionStatus,
  isPlatformSubscriptionActive,
} from "@/utils/stripe/subscription";

type SettingsPageProps = {
  profile: Profile;
  connectStatus?: string | null;
};

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6">
      <div className="space-y-1">
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        {description ? (
          <p className="text-xs text-zinc-500">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function SettingsPage({
  profile,
  connectStatus = null,
}: SettingsPageProps) {
  const isFreelancer = profile.role === "freelancer";
  const subscriptionActive = isPlatformSubscriptionActive(
    profile.subscription_status,
  );
  const periodEnd = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString(
        undefined,
        { month: "short", day: "numeric", year: "numeric" },
      )
    : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Account
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          Settings
        </h1>
        <p className="text-sm text-zinc-500">
          Manage how you appear as {displayName(profile)} and how you sign in.
        </p>
      </div>

      <SettingsSection
        title="Profile"
        description={
          isFreelancer
            ? "Clients see this name on projects and invites."
            : "Workspace owners see this name on your projects."
        }
      >
        <div className="max-w-sm">
          <ProfileNameForm
            initialFullName={profile.full_name}
            email={profile.email}
          />
        </div>
        <div className="mt-5 max-w-sm space-y-1.5 border-t border-zinc-100 pt-5">
          <p className="text-xs font-medium text-zinc-500">Email</p>
          <p className="truncate text-sm text-zinc-900" title={profile.email}>
            {profile.email}
          </p>
          <p className="text-xs text-zinc-400">
            Sign-in email can’t be changed here.
          </p>
        </div>
      </SettingsSection>

      <SettingsSection
        title="Security"
        description={
          profile.password_set
            ? "Change the password you use with email sign-in."
            : "You’re on magic-link sign-in. Set a password for next time."
        }
      >
        <div className="max-w-sm">
          <ChangePasswordForm hasPassword={profile.password_set} />
        </div>
      </SettingsSection>

      <SettingsSection
        title="Notifications"
        description="Choose where Finalia sends action reminders and set optional quiet hours."
      >
        <NotificationPreferencesForm />
      </SettingsSection>

      {isFreelancer ? (
        <>
          <SettingsSection
            title="Client workspace branding"
            description="Logo, colors, and welcome message apply across all client workspaces and invite emails."
          >
            <BrandingForm profile={profile} />
          </SettingsSection>

          <SettingsSection
            title="Billing"
            description="Finalia Pro unlocks projects, invoices, and the file vault."
          >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    subscriptionActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-zinc-200 bg-zinc-50 text-zinc-700",
                  )}
                >
                  {formatSubscriptionStatus(profile.subscription_status)}
                </span>
                <p className="text-sm text-zinc-600">
                  {subscriptionActive
                    ? periodEnd
                      ? `Finalia Pro · current period through ${periodEnd}`
                      : "Finalia Pro is active on this account."
                    : "No active Finalia Pro plan. Start a trial or subscribe from Billing."}
                </p>
              </div>
              <Link
                href="/dashboard/billing"
                className={cn(
                  buttonVariants({ size: "sm", variant: "outline" }),
                  "shrink-0 shadow-sm",
                )}
              >
                <CreditCard className="size-3.5" />
                Open billing
                <ArrowUpRight className="size-3.5" />
              </Link>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Payouts"
            description="Client invoice payments go to your Stripe Connect account."
          >
            <StripeConnectBanner
              chargesEnabled={profile.stripe_charges_enabled}
              detailsSubmitted={profile.stripe_details_submitted}
              hasAccount={Boolean(profile.stripe_account_id)}
              connectStatus={connectStatus}
            />
            {profile.stripe_charges_enabled ? (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
                <Wallet className="size-3.5" />
                Manage or update Connect details anytime from Invoices if Stripe
                asks you to finish verification.
              </p>
            ) : null}
          </SettingsSection>
        </>
      ) : null}

      <SettingsSection title="Account">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-800">
              {isFreelancer ? "Workspace owner" : "Client"}
            </span>
            <p className="text-sm text-zinc-600">
              Signed in as{" "}
              <span className="font-medium text-zinc-900">{profile.email}</span>
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="outline" size="sm" className="shadow-sm">
              Sign out
            </Button>
          </form>
        </div>
      </SettingsSection>

      <section className="rounded-2xl border border-red-200/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-red-900">Delete account</h2>
          <p className="text-xs text-zinc-500">
            Danger zone: permanent removal of this login and Finalia data tied
            to you.
          </p>
        </div>
        <div className="mt-4">
          <DeleteAccountForm email={profile.email} role={profile.role} />
        </div>
      </section>
    </div>
  );
}
