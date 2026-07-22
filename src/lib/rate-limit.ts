type Bucket = { count: number; resetAt: number };

const localBuckets = new Map<string, Bucket>();

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  source: "redis" | "memory";
};

function localRateLimit(key: string, limit: number, windowSeconds: number) {
  const now = Date.now();
  const current = localBuckets.get(key);
  const bucket = !current || current.resetAt <= now
    ? { count: 0, resetAt: now + windowSeconds * 1000 }
    : current;

  bucket.count += 1;
  localBuckets.set(key, bucket);

  // Bound memory in long-lived local/server instances.
  if (localBuckets.size > 5_000) {
    for (const [bucketKey, value] of localBuckets) {
      if (value.resetAt <= now) localBuckets.delete(bucketKey);
    }
  }

  return {
    allowed: bucket.count <= limit,
    limit,
    remaining: Math.max(0, limit - bucket.count),
    resetAt: bucket.resetAt,
    source: "memory" as const,
  };
}

/**
 * Fixed-window limiter. Uses a Vercel KV/Upstash REST store when configured,
 * and a safe per-instance fallback for local development and previews.
 */
export async function rateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<RateLimitResult> {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) return localRateLimit(key, limit, windowSeconds);

  const window = Math.floor(Date.now() / (windowSeconds * 1000));
  const redisKey = `portal:rate:${key}:${window}`;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, String(windowSeconds + 1)],
      ]),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Redis returned ${response.status}`);

    const result = (await response.json()) as Array<{ result?: number }>;
    const count = Number(result[0]?.result ?? 1);
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      resetAt: (window + 1) * windowSeconds * 1000,
      source: "redis",
    };
  } catch {
    return localRateLimit(key, limit, windowSeconds);
  }
}

export function rateLimitHeaders(result: RateLimitResult) {
  return {
    "RateLimit-Limit": String(result.limit),
    "RateLimit-Remaining": String(result.remaining),
    "RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };
}
