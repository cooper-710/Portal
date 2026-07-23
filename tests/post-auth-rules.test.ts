import { describe, expect, it } from "vitest";

import {
  freelancerNeedsOnboarding,
  onboardingPath,
  progressForStep,
  resolveNextStep,
  resolveResumeStep,
  shouldAutoSkipStep,
} from "../src/utils/onboarding/steps";
import { resolvePostAuthDestination } from "../src/utils/supabase/post-auth-rules";

describe("resolvePostAuthDestination", () => {
  it("sends freelancers needing onboarding to the wizard", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "freelancer",
        passwordSet: true,
        needsOnboarding: true,
        onboardingPath: "/onboarding/welcome",
      }),
    ).toBe("/onboarding/welcome");
  });

  it("does not dump incomplete freelancers into billing FOMO", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard/billing",
        role: "freelancer",
        passwordSet: true,
        needsOnboarding: true,
        onboardingPath: "/onboarding/trial",
      }),
    ).toBe("/onboarding/trial");
  });

  it("wraps destination in password onboarding when needed", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "freelancer",
        passwordSet: false,
        needsOnboarding: true,
        onboardingPath: "/onboarding/welcome",
      }),
    ).toBe(
      `/onboarding/password?next=${encodeURIComponent("/onboarding/welcome")}`,
    );
  });

  it("sends completed freelancers to dashboard", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard/billing",
        role: "freelancer",
        passwordSet: true,
        needsOnboarding: false,
      }),
    ).toBe("/dashboard");
  });

  it("does not send clients to freelancer onboarding", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "client",
        passwordSet: true,
        needsOnboarding: true,
        onboardingPath: "/onboarding/welcome",
      }),
    ).toBe("/dashboard");
  });

  it("preserves deep onboarding links when still incomplete", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/onboarding/branding",
        role: "freelancer",
        passwordSet: true,
        needsOnboarding: true,
        onboardingPath: "/onboarding/stripe",
      }),
    ).toBe("/onboarding/stripe");
  });
});

describe("freelancerNeedsOnboarding", () => {
  it("is true only for freelancers without completion", () => {
    expect(
      freelancerNeedsOnboarding({
        role: "freelancer",
        onboarding_completed_at: null,
      }),
    ).toBe(true);
    expect(
      freelancerNeedsOnboarding({
        role: "freelancer",
        onboarding_completed_at: "2026-07-21T00:00:00Z",
      }),
    ).toBe(false);
    expect(
      freelancerNeedsOnboarding({
        role: "client",
        onboarding_completed_at: null,
      }),
    ).toBe(false);
  });
});

describe("onboarding skip + resume", () => {
  it("auto-skips trial when already trialing/active", () => {
    expect(
      shouldAutoSkipStep("trial", {
        profile: { role: "freelancer", subscription_status: "trialing" },
        hasProject: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoSkipStep("trial", {
        profile: { role: "freelancer", subscription_status: "none" },
        hasProject: false,
      }),
    ).toBe(false);
  });

  it("auto-skips stripe when charges enabled", () => {
    expect(
      shouldAutoSkipStep("stripe", {
        profile: { role: "freelancer", stripe_charges_enabled: true },
        hasProject: false,
      }),
    ).toBe(true);
  });

  it("auto-skips branding when legacy setup or business name exists", () => {
    expect(
      shouldAutoSkipStep("branding", {
        profile: {
          role: "freelancer",
          portal_setup_completed_at: "2026-07-21T00:00:00Z",
        },
        hasProject: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoSkipStep("branding", {
        profile: { role: "freelancer", business_name: "River" },
        hasProject: false,
      }),
    ).toBe(true);
  });

  it("skips project when one exists and invite when none / already invited", () => {
    expect(
      shouldAutoSkipStep("project", {
        profile: { role: "freelancer" },
        hasProject: true,
      }),
    ).toBe(true);
    expect(
      shouldAutoSkipStep("invite", {
        profile: { role: "freelancer" },
        hasProject: false,
      }),
    ).toBe(true);
    expect(
      shouldAutoSkipStep("invite", {
        profile: { role: "freelancer" },
        hasProject: true,
        hasClientInvite: true,
      }),
    ).toBe(true);
  });

  it("advances past auto-skipped steps", () => {
    expect(
      resolveNextStep("welcome", {
        profile: {
          role: "freelancer",
          subscription_status: "active",
          stripe_charges_enabled: true,
          business_name: "River",
        },
        hasProject: true,
        hasClientInvite: true,
      }),
    ).toBe("done");
  });

  it("resumes at stored step unless it should be skipped", () => {
    expect(
      resolveResumeStep({
        profile: {
          role: "freelancer",
          onboarding_step: "trial",
          subscription_status: "trialing",
        },
        hasProject: false,
      }),
    ).toBe("stripe");

    expect(
      onboardingPath(
        resolveResumeStep({
          profile: {
            role: "freelancer",
            onboarding_step: null,
          },
          hasProject: false,
        }),
      ),
    ).toBe("/onboarding/welcome");
  });

  it("reports progress as N/6 for guided steps", () => {
    expect(progressForStep("welcome")).toEqual({ current: 1, total: 6 });
    expect(progressForStep("invite")).toEqual({ current: 6, total: 6 });
    expect(progressForStep("done")).toBeNull();
  });
});
