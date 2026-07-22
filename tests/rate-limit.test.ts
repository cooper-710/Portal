import { afterEach, describe, expect, it } from "vitest";

import { rateLimit } from "@/lib/rate-limit";

const originalKvUrl = process.env.KV_REST_API_URL;
const originalKvToken = process.env.KV_REST_API_TOKEN;

afterEach(() => {
  if (originalKvUrl === undefined) delete process.env.KV_REST_API_URL;
  else process.env.KV_REST_API_URL = originalKvUrl;
  if (originalKvToken === undefined) delete process.env.KV_REST_API_TOKEN;
  else process.env.KV_REST_API_TOKEN = originalKvToken;
});

describe("rate limiter", () => {
  it("enforces the local fixed-window limit", async () => {
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    const key = `test:${crypto.randomUUID()}`;

    expect((await rateLimit(key, { limit: 2, windowSeconds: 60 })).allowed).toBe(true);
    expect((await rateLimit(key, { limit: 2, windowSeconds: 60 })).remaining).toBe(0);
    expect((await rateLimit(key, { limit: 2, windowSeconds: 60 })).allowed).toBe(false);
  });
});
