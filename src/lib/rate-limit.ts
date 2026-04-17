// Simple in-memory rate limiter (no external dependencies).
// ⚠️  LIMITATION: This is per-process only and will NOT work correctly
// behind a load balancer with multiple app instances.
// For multi-instance deployments, replace with Redis-backed rate limiting.

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt < now) store.delete(key);
  }
}, 60_000); // every 60s

export type RateLimitConfig = {
  /** Max requests allowed in the window */
  max: number;
  /** Window size in seconds */
  windowSec: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

/**
 * Check rate limit for a given key (e.g. IP address or user ID).
 */
export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt < now) {
    // First request or window expired
    store.set(key, { count: 1, resetAt: now + config.windowSec * 1000 });
    return { allowed: true, remaining: config.max - 1, resetAt: now + config.windowSec * 1000 };
  }

  entry.count++;
  const remaining = Math.max(0, config.max - entry.count);
  const allowed = entry.count <= config.max;

  return { allowed, remaining, resetAt: entry.resetAt };
}

/**
 * Get client IP from request headers (works behind proxies).
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

/**
 * Apply rate limit and return a 429 response if exceeded.
 * Returns null if allowed, or a Response if rate limited.
 */
export function rateLimitResponse(key: string, config: RateLimitConfig): Response | null {
  const result = checkRateLimit(key, config);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfter),
          "X-RateLimit-Limit": String(config.max),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(result.resetAt),
        },
      }
    );
  }
  return null;
}

// Preset configurations
export const RATE_LIMITS = {
  /** Login: 5 attempts per 60 seconds per IP */
  login: { max: 5, windowSec: 60 } as RateLimitConfig,
  /** General API: 100 requests per 60 seconds per IP */
  api: { max: 100, windowSec: 60 } as RateLimitConfig,
  /** Sensitive operations (password change, etc): 10 per 5 min */
  sensitive: { max: 10, windowSec: 300 } as RateLimitConfig,
};
