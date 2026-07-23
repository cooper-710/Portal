import { describe, expect, it } from "vitest";

import { resolveNotificationSwitches } from "@/lib/notifications/config";

describe("notification kill switches", () => {
  it("keeps every channel enabled when variables are unset", () => {
    expect(resolveNotificationSwitches({})).toEqual({
      all: true,
      email: true,
      push: true,
    });
  });

  it.each(["0", "false", "off", "disabled"])("recognizes %s as disabled", (value) => {
    expect(resolveNotificationSwitches({
      NOTIFICATIONS_ENABLED: value,
      NOTIFICATION_EMAILS_ENABLED: value.toUpperCase(),
      NOTIFICATION_PUSH_ENABLED: value,
    })).toEqual({ all: false, email: false, push: false });
  });
});

