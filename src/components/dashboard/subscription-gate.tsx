import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  FileLock2,
  FolderKanban,
  Lock,
  Receipt,
  Sparkles,
} from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FINALIA_PRO_TRIAL_DAYS } from "@/utils/stripe/subscription";

export function UpgradeLink({
  label = "Start free trial",
  size = "default",
  variant = "default",
  className,
}: {
  label?: string;
  size?: "default" | "sm" | "lg" | "xs";
  variant?: "default" | "outline" | "secondary" | "ghost";
  className?: string;
}) {
  return (
    <Link
      href="/dashboard/billing"
      className={cn(buttonVariants({ size, variant }), "shadow-sm", className)}
    >
      <Sparkles className="size-3.5" />
      {label}
    </Link>
  );
}

/** Banner for locked freelancers on dashboard chrome. */
export function UpgradeBanner({
  className,
  message = `Finalia Pro includes a ${FINALIA_PRO_TRIAL_DAYS}-day free trial, then $25/mo. Start a trial to unlock projects, invoices, and the file vault.`,
}: {
  className?: string;
  message?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-blue-200/80 bg-gradient-to-r from-blue-50 via-white to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-white shadow-sm">
          <Lock className="size-3.5 text-blue-700" />
        </div>
        <p className="text-sm text-zinc-700">{message}</p>
      </div>
      <UpgradeLink
        size="sm"
        label="Start free trial"
        className="shrink-0 self-start sm:self-auto"
      />
    </div>
  );
}

/** Empty / locked placeholder that previews value and CTAs to billing. */
export function LockedEmptyState({
  title,
  description,
  icon,
  className,
  ctaLabel = "Start free trial",
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  className?: string;
  ctaLabel?: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      className={className}
      action={<UpgradeLink label={ctaLabel} />}
    />
  );
}

/** Full-page locked preview when freelancers lack trial/paid access. */
export function FreelancerLockedPreview({
  title,
  subtitle,
  email,
}: {
  title: string;
  subtitle: string;
  email?: string | null;
}) {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
          Workspace
        </p>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
          {title}
        </h1>
        <p className="text-sm text-zinc-500">
          {subtitle}
          {email ? ` · ${email}` : ""}
        </p>
      </div>

      <UpgradeBanner />

      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-gradient-to-br from-white via-white to-zinc-50 shadow-sm">
          <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <FolderKanban className="size-3.5 text-zinc-500" />
              Projects
            </div>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <LockedEmptyState
              icon={FolderKanban}
              className="border-0 bg-transparent py-8"
              title="Create your first project"
              description="Invite clients, track phases from Discovery to Completed, and keep every engagement in one place."
            />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/80 via-white to-white shadow-sm">
          <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-white/80 px-2.5 py-1 text-xs font-medium text-zinc-600 shadow-sm">
              <Receipt className="size-3.5 text-amber-600" />
              Invoices
            </div>
          </div>
          <div className="px-4 py-4 sm:px-5">
            <LockedEmptyState
              icon={Receipt}
              className="border-0 bg-transparent py-8"
              title="Send invoices to clients"
              description="Bill clients and get paid to your connected Stripe account, unlocked with Finalia Pro."
            />
          </div>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm">
        <div className="border-b border-zinc-200/60 px-4 py-4 sm:px-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
            <FileLock2 className="size-3.5 text-zinc-500" />
            File vault
          </div>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <LockedEmptyState
            icon={FileLock2}
            className="border-0 bg-transparent py-8"
            title="Share deliverables securely"
            description="Keep internal files private and unlock approved deliverables for clients when you’re ready."
          />
        </div>
      </section>
    </div>
  );
}

export function isSubscriptionRequiredError(message: string | null | undefined) {
  if (!message) return false;
  return /subscribe|finalia pro|portal pro|billing|active plan|free trial|trial/i.test(message);
}

export function SubscriptionErrorNotice({
  error,
  className,
}: {
  error: string;
  className?: string;
}) {
  const needsUpgrade = isSubscriptionRequiredError(error);

  return (
    <div
      className={cn(
        "rounded-xl border px-3.5 py-2.5 text-sm",
        needsUpgrade
          ? "border-blue-200 bg-blue-50 text-blue-950"
          : "border-red-200 bg-red-50 text-red-800",
        className,
      )}
    >
      <p>{error}</p>
      {needsUpgrade ? (
        <Link
          href="/dashboard/billing"
          className="mt-2 inline-flex text-sm font-semibold text-blue-700 underline-offset-2 hover:underline"
        >
          Start free trial →
        </Link>
      ) : null}
    </div>
  );
}
