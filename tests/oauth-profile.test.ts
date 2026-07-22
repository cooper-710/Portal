import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";

import {
  displayNameFromMetadata,
  isOAuthUser,
} from "../src/utils/supabase/oauth-profile";

function fakeUser(partial: Partial<User> & { app_metadata?: User["app_metadata"] }): User {
  return {
    id: "user-1",
    aud: "authenticated",
    role: "authenticated",
    email: "a@example.com",
    created_at: new Date().toISOString(),
    app_metadata: {},
    user_metadata: {},
    identities: [],
    ...partial,
  } as User;
}

describe("isOAuthUser", () => {
  it("detects google provider", () => {
    expect(
      isOAuthUser(
        fakeUser({ app_metadata: { provider: "google", providers: ["google"] } }),
      ),
    ).toBe(true);
  });

  it("treats email provider as non-oauth", () => {
    expect(
      isOAuthUser(
        fakeUser({ app_metadata: { provider: "email", providers: ["email"] } }),
      ),
    ).toBe(false);
  });
});

describe("displayNameFromMetadata", () => {
  it("prefers full_name then name", () => {
    expect(
      displayNameFromMetadata(
        fakeUser({ user_metadata: { full_name: "Alex Rivera", name: "Alex" } }),
      ),
    ).toBe("Alex Rivera");
    expect(
      displayNameFromMetadata(fakeUser({ user_metadata: { name: "Alex" } })),
    ).toBe("Alex");
    expect(displayNameFromMetadata(fakeUser({ user_metadata: {} }))).toBeNull();
  });
});
