"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Check,
  CreditCard,
  FileLock2,
  FolderKanban,
  Loader2,
  Receipt,
  ShieldCheck,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { displayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";
import { friendlyBillingError } from "@/utils/billing-errors";
import {
  formatSubscriptionStatus,
  isPlatformSubscriptionActive,
  PORTAL_PRO_TRIAL_DAYS,
} from "@/utils/stripe/subscription";

type BillingPageProps = {
  profile: Profile;
  notice?: string | null;
};

const INCLUDED = [
  {
    icon: FolderKanban,
    title: "Unlimited projects",
    body: "Invite clients and run every engagement from one workspace.",
  },
  {
    icon: FileLock2,
    title: "Secure file vault",
    body: "Internal files stay private. Deliverables unlock for clients.",
  },
  {
    icon: Receipt,
    title: "Client invoicing",
    body: "Send invoices and get paid to your connected Stripe account.",
  },
  {
    icon: ShieldCheck,
    title: "Live project phases",
    body: "Clients always see Discovery → Completed status in real time.",
  },
];

export function FreelancerBillingPage({ profile, notice }: BillingPageProps) {
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingPortal, setLoadingPortal] = useState(false);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = isPlatformSubscriptionActive(profile.subscription_status);
  const isTrialing = profile.subscription_status === "trialing";
  const periodEnd = profile.subscription_current_period_end
    ? new Date(profile.subscription_current_period_end).toLocaleDateString(
        undefined,
        { month: "long", day: "numeric", year: "numeric" },
      )
    : null;
  const canRefresh = Boolean(profile.stripe_customer_id);

  async function refreshSubscription() {
    setLoadingRefresh(true);
    setError(null);
    try {
      const response = await fetch("/api/saas-sync", { method: "POST" });
      const data = (await response.json()) as {
        unlocked?: boolean;
        error?: string;
      };
      if (!response.ok) {
        setError(
          friendlyBillingError(data.error, "Unable to refresh subscription."),
        );
        setLoadingRefresh(false);
        return;
      }
      window.location.assign(
        data.unlocked ? "/dashboard?subscribed=1" : "/dashboard/billing",
      );
    } catch {
      setError(friendlyBillingError(null, "Unable to refresh subscription."));
      setLoadingRefresh(false);
    }
  }

  async function startCheckout() {
    setLoadingCheckout(true);
    setError(null);
    try {
      const response = await fetch("/api/saas-checkout", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(friendlyBillingError(data.error, "Unable to start checkout."));
        setLoadingCheckout(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError(friendlyBillingError(null, "Unable to start checkout."));
      setLoadingCheckout(false);
    }
  }

  async function openPortal() {
    setLoadingPortal(true);
    setError(null);
    try {
      const response = await fetch("/api/saas-portal", { method: "POST" });
      const data = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !data.url) {
        setError(
          friendlyBillingError(data.error, "Unable to open billing portal."),
        );
        setLoadingPortal(false);
        return;
      }
      window.location.assign(data.url);
    } catch {
      setError(friendlyBillingError(null, "Unable to open billing portal."));
      setLoadingPortal(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="space-y-1 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          {active ? "Your plan" : "Unlock Portal"}
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">
          {active ? "Billing" : "Start your free trial"}
        </h1>
        <p className="text-sm text-zinc-500 sm:text-base">
          {active
            ? `Signed in as ${displayName(profile)}`
            : `${PORTAL_PRO_TRIAL_DAYS}-day free trial, then $25/mo. Projects, invoices, and the file vault stay locked until you begin.`}
        </p>
      </div>

      {notice ? (
        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-sm text-blue-900">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {!active ? (
        <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
          <div className="border-b border-zinc-100 bg-gradient-to-br from-blue-50/90 via-white to-white px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-800">
                  Portal Pro
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-5xl font-semibold tracking-tight text-zinc-900">
                    $25
                  </span>
                  <span className="text-base text-zinc-500">/ month</span>
                </div>
                <p className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-900">
                  Includes {PORTAL_PRO_TRIAL_DAYS}-day free trial
                </p>
                <p className="max-w-sm text-sm leading-relaxed text-zinc-500">
                  Try the full workspace free for {PORTAL_PRO_TRIAL_DAYS} days.
                  After the trial, Portal Pro continues at $25/mo unless you
                  cancel. Client invoices include a ~1% platform fee.
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <Button
                  size="lg"
                  className="w-full shadow-sm sm:w-auto"
                  disabled={loadingCheckout}
                  onClick={() => void startCheckout()}
                >
                  {loadingCheckout ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Start {PORTAL_PRO_TRIAL_DAYS}-day free trial
                </Button>
                {canRefresh ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full border-zinc-200 bg-white shadow-sm sm:w-auto"
                    disabled={loadingRefresh}
                    onClick={() => void refreshSubscription()}
                  >
                    {loadingRefresh ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Refresh subscription
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <ul className="grid gap-0 sm:grid-cols-2">
            {INCLUDED.map((item) => (
              <li
                key={item.title}
                className="flex gap-3 border-t border-zinc-100 px-6 py-5 sm:px-8 sm:odd:border-r"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50">
                  <item.icon className="size-4 text-blue-700" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-zinc-500">
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-zinc-100 bg-zinc-50/80 px-6 py-4 sm:px-8">
            <p className="text-xs text-zinc-500">
              You won’t be charged during the {PORTAL_PRO_TRIAL_DAYS}-day trial.
              After that, billing is $25/mo. A ~1% platform fee applies to client
              invoice payments. Cancel anytime in Stripe. By starting you agree
              to our{" "}
              <Link href="/terms" className="underline underline-offset-2">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="underline underline-offset-2">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </section>
      ) : (
        <section className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-sm">
          <div className="bg-gradient-to-br from-emerald-50/90 via-white to-white px-6 py-8 sm:px-8">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-800">
                  <Check className="size-3" />
                  {formatSubscriptionStatus(profile.subscription_status)}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-500">Portal Pro</p>
                  <p className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">
                    $25<span className="text-lg font-medium text-zinc-500">/mo</span>
                  </p>
                </div>
                <p className="max-w-md text-sm text-zinc-500">
                  {isTrialing && periodEnd
                    ? `Your free trial runs through ${periodEnd}. After that you’ll be billed $25/mo unless you cancel in the Stripe portal.`
                    : periodEnd
                      ? `Current period through ${periodEnd}. Manage payment methods, invoices, and cancellation in the Stripe portal.`
                      : "Your workspace is unlocked. Manage billing in the Stripe customer portal."}
                </p>
              </div>
              <div className="flex w-full flex-col gap-2 sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-zinc-200 bg-white shadow-sm sm:w-auto"
                  disabled={loadingPortal}
                  onClick={() => void openPortal()}
                >
                  {loadingPortal ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CreditCard className="size-4" />
                  )}
                  Manage billing
                </Button>
                <Button
                  size="lg"
                  variant="ghost"
                  className="w-full sm:w-auto"
                  disabled={loadingRefresh || !canRefresh}
                  onClick={() => void refreshSubscription()}
                >
                  {loadingRefresh ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  Refresh subscription
                </Button>
              </div>
            </div>
          </div>

          <ul className="grid gap-2 border-t border-zinc-100 px-6 py-5 sm:grid-cols-2 sm:px-8">
            {INCLUDED.map((item) => (
              <li key={item.title} className="flex items-start gap-2 text-sm text-zinc-600">
                <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                <span>
                  <span className="font-medium text-zinc-900">{item.title}</span>
                  {" · "}
                  {item.body}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!active ? (
        <p className={cn("text-center text-xs text-zinc-400")}>
          Secure checkout powered by Stripe. Card required to start the trial;
          you won’t be charged until it ends.
        </p>
      ) : null}

      <section className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-sm font-semibold text-zinc-900">Your profile</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Display name and password live in Settings.
        </p>
        <div className="mt-4">
          <Link
            href="/dashboard/settings"
            className={cn(
              buttonVariants({ size: "sm", variant: "outline" }),
              "shadow-sm",
            )}
          >
            Edit in Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
