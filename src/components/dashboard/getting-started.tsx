"use client";

import Link from "next/link";
import {
  CheckCircle2,
  Circle,
  FolderKanban,
  Palette,
  Wallet,
} from "lucide-react";

import { NewProjectDialog } from "@/components/dashboard/new-project-dialog";
import { StripeConnectBanner } from "@/components/dashboard/stripe-connect-banner";
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
} from "@/components/dashboard/dashboard-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Profile } from "@/types/database";

type GettingStartedProps = {
  profile: Profile;
  projectCount: number;
  onProjectCreated?: () => void;
};

type Step = {
  id: string;
  title: string;
  description: string;
  done: boolean;
  icon: typeof Wallet;
};

export function GettingStartedChecklist({
  profile,
  projectCount,
  onProjectCreated,
}: GettingStartedProps) {
  const connectDone = Boolean(profile.stripe_charges_enabled);
  const projectDone = projectCount > 0;
  const brandingDone = Boolean(profile.business_name?.trim());

  const steps: Step[] = [
    {
      id: "connect",
      title: "Connect Stripe payouts",
      description:
        "Clients can only pay after Stripe Connect Express is complete.",
      done: connectDone,
      icon: Wallet,
    },
    {
      id: "project",
      title: "Create your first project",
      description: "Invite a client by email and share a private workspace.",
      done: projectDone,
      icon: FolderKanban,
    },
    {
      id: "branding",
      title: "Add your business name",
      description: "Clients see your brand on their portal home.",
      done: brandingDone,
      icon: Palette,
    },
  ];

  const remaining = steps.filter((step) => !step.done).length;
  if (remaining === 0) return null;

  return (
    <DashboardCard
      fillHeight={false}
      constrainHeight={false}
      className="border-blue-200/70 bg-gradient-to-br from-blue-50/80 via-white to-white"
    >
      <DashboardCardHeader className="bg-inherit">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
          Getting started
        </p>
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-900">
          Finish setup to bill your first client
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          {remaining} step{remaining === 1 ? "" : "s"} left before you’re ready
          for a paying engagement.
        </p>
      </DashboardCardHeader>

      <DashboardCardBody scrollable={false} className="p-0 sm:p-0">
        <ul className="divide-y divide-zinc-100">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <li
                key={step.id}
                className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5"
              >
                <div className="flex items-start gap-3">
                  {step.done ? (
                    <CheckCircle2
                      className="mt-0.5 size-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                  ) : (
                    <Circle
                      className="mt-0.5 size-4 shrink-0 text-zinc-300"
                      aria-hidden
                    />
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Icon className="size-3.5 text-zinc-400" aria-hidden />
                      <p
                        className={cn(
                          "text-sm font-semibold",
                          step.done
                            ? "text-zinc-500 line-through"
                            : "text-zinc-900",
                        )}
                      >
                        {step.title}
                      </p>
                    </div>
                    <p className="text-xs text-zinc-500">{step.description}</p>
                  </div>
                </div>

                {!step.done && step.id === "project" ? (
                  <NewProjectDialog onCreated={onProjectCreated} />
                ) : null}
                {!step.done && step.id === "branding" ? (
                  <Link
                    href="/dashboard/settings"
                    className={cn(
                      buttonVariants({ size: "sm", variant: "outline" }),
                      "shrink-0 shadow-sm",
                    )}
                  >
                    Open settings
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>

        {!connectDone ? (
          <div className="border-t border-zinc-100 px-4 py-4 sm:px-5">
            <StripeConnectBanner
              chargesEnabled={Boolean(profile.stripe_charges_enabled)}
              detailsSubmitted={Boolean(profile.stripe_details_submitted)}
              hasAccount={Boolean(profile.stripe_account_id)}
            />
          </div>
        ) : null}
      </DashboardCardBody>
    </DashboardCard>
  );
}
