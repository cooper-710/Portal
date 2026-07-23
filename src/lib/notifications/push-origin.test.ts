import { describe, expect, it } from "vitest";

import {
  eligiblePushSubscriptions,
  normalizePushOrigin,
  stalePushSubscriptionIds,
} from "@/lib/notifications/push-origin";

const subscriptions = [
  {
    id: "old",
    endpoint: "https://push.example/old",
    origin: "https://portal-sigma-azure.vercel.app",
  },
  {
    id: "legacy",
    endpoint: "https://push.example/legacy",
    origin: null,
  },
  {
    id: "current",
    endpoint: "https://push.example/current",
    origin: "https://finalia.app",
  },
  {
    id: "second-device",
    endpoint: "https://push.example/second-device",
    origin: "https://finalia.app",
  },
];

describe("push subscription origins", () => {
  it("strips paths and rejects malformed origins safely", () => {
    expect(normalizePushOrigin("https://FINALIA.app/settings")).toBe(
      "https://finalia.app",
    );
    expect(normalizePushOrigin("not a URL")).toBeNull();
  });

  it("delivers only through the canonical production origin", () => {
    expect(
      eligiblePushSubscriptions(subscriptions, "https://finalia.app").map(
        (subscription) => subscription.id,
      ),
    ).toEqual(["current", "second-device"]);
  });

  it("removes preview and legacy subscriptions after canonical registration", () => {
    expect(
      stalePushSubscriptionIds(
        subscriptions,
        "https://push.example/current",
        "https://finalia.app",
        "https://finalia.app",
      ),
    ).toEqual(["old", "legacy"]);
  });

  it("does not clean production subscriptions from a preview deployment", () => {
    expect(
      stalePushSubscriptionIds(
        subscriptions,
        "https://push.example/preview",
        "https://preview.example",
        "https://finalia.app",
      ),
    ).toEqual([]);
  });
});
