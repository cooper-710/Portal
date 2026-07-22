import { describe, expect, it } from "vitest";

import {
  freelancerNeedsPortalSetup,
  resolvePostAuthDestination,
} from "../src/utils/supabase/post-auth-rules";

describe("resolvePostAuthDestination", () => {
  it("sends freelancers without access from /dashboard to billing", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "freelancer",
        passwordSet: true,
        hasWorkspaceAccess: false,
      }),
    ).toBe("/dashboard/billing");
  });

  it("sends freelancers with access away from billing to dashboard", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard/billing",
        role: "freelancer",
        passwordSet: true,
        hasWorkspaceAccess: true,
        needsPortalSetup: false,
      }),
    ).toBe("/dashboard");
  });

  it("wraps destination in password onboarding when needed", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "freelancer",
        passwordSet: false,
        hasWorkspaceAccess: false,
      }),
    ).toBe(
      `/onboarding/password?next=${encodeURIComponent("/dashboard/billing")}`,
    );
  });

  it("routes unlocked freelancers to portal customize when needed", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "freelancer",
        passwordSet: true,
        hasWorkspaceAccess: true,
        needsPortalSetup: true,
      }),
    ).toBe(
      `/onboarding/portal?next=${encodeURIComponent("/dashboard")}`,
    );
  });

  it("does not send clients to portal setup", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard",
        role: "client",
        passwordSet: true,
        hasWorkspaceAccess: true,
        needsPortalSetup: true,
      }),
    ).toBe("/dashboard");
  });

  it("does not interrupt billing when trial is still required", () => {
    expect(
      resolvePostAuthDestination({
        nextPath: "/dashboard/billing",
        role: "freelancer",
        passwordSet: true,
        hasWorkspaceAccess: false,
        needsPortalSetup: true,
      }),
    ).toBe("/dashboard/billing");
  });
});

describe("freelancerNeedsPortalSetup", () => {
  it("is true only for freelancers without completion or business name", () => {
    expect(
      freelancerNeedsPortalSetup({
        role: "freelancer",
        portal_setup_completed_at: null,
        business_name: null,
      }),
    ).toBe(true);
  });

  it("is false after skip/complete or existing branding", () => {
    expect(
      freelancerNeedsPortalSetup({
        role: "freelancer",
        portal_setup_completed_at: "2026-07-21T00:00:00Z",
        business_name: null,
      }),
    ).toBe(false);
    expect(
      freelancerNeedsPortalSetup({
        role: "freelancer",
        portal_setup_completed_at: null,
        business_name: "River Studio",
      }),
    ).toBe(false);
    expect(
      freelancerNeedsPortalSetup({
        role: "client",
        portal_setup_completed_at: null,
        business_name: null,
      }),
    ).toBe(false);
  });
});
