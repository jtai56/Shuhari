import { Ratelimit, type Duration } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const ROUTE_RATE_LIMITS = {
  analyze: { max: 12, window: "1 m" as const, windowMs: 60_000 },
  "try-on": { max: 8, window: "1 m" as const, windowMs: 60_000 },
  checkout: { max: 25, window: "1 m" as const, windowMs: 60_000 },
  "checkout-verify": { max: 45, window: "1 m" as const, windowMs: 60_000 },
  leads: { max: 40, window: "1 h" as const, windowMs: 3_600_000 },
  survey: { max: 20, window: "1 h" as const, windowMs: 3_600_000 },
} as const;

export type RateLimitRoute = keyof typeof ROUTE_RATE_LIMITS;

const memoryBuckets = new Map<string, number[]>();

function slidingWindowMemory(
  key: string,
  max: number,
  windowMs: number,
): { success: boolean; limit: number; remaining: number; reset: number } {
  const now = Date.now();
  const cutoff = now - windowMs;
  let stamps = memoryBuckets.get(key) ?? [];
  stamps = stamps.filter((t) => t > cutoff);

  if (stamps.length >= max) {
    const reset = stamps[0]! + windowMs;
    memoryBuckets.set(key, stamps);
    return {
      success: false,
      limit: max,
      remaining: 0,
      reset,
    };
  }

  stamps.push(now);
  memoryBuckets.set(key, stamps);
  return {
    success: true,
    limit: max,
    remaining: max - stamps.length,
    reset: now + windowMs,
  };
}

const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashRatelimit(max: number, window: Duration): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    return null;
  }

  const cacheKey = `${max}:${window}`;
  let instance = upstashLimiters.get(cacheKey);
  if (!instance) {
    instance = new Ratelimit({
      redis: new Redis({ url, token }),
      limiter: Ratelimit.slidingWindow(max, window),
      prefix: "@earth-tone/ratelimit",
    });
    upstashLimiters.set(cacheKey, instance);
  }

  return instance;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

/**
 * Returns a 429 Response when limited, or null when the request may proceed.
 * Uses Upstash Redis when UPSTASH_* env vars are set; otherwise an in-memory
 * window (fine for local dev, not reliable across many serverless instances).
 */
export async function rateLimitResponse(
  request: Request,
  route: RateLimitRoute,
): Promise<Response | null> {
  const cfg = ROUTE_RATE_LIMITS[route];
  const id = `${route}:${getClientIp(request)}`;

  const limiter = getUpstashRatelimit(cfg.max, cfg.window);
  let result: {
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  };

  if (limiter) {
    const res = await limiter.limit(id);
    await res.pending.catch(() => undefined);
    result = {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
    };
  } else {
    result = slidingWindowMemory(id, cfg.max, cfg.windowMs);
  }

  if (result.success) {
    return null;
  }

  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );

  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSec),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.reset / 1000)),
      },
    },
  );
}
