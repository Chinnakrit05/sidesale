import { describe, it, expect, beforeEach, vi } from "vitest";
import { checkRateLimit, rateLimitResponse, getClientIp, RATE_LIMITS } from "../rate-limit";

// Reset the module between tests to clear the in-memory store
beforeEach(async () => {
  vi.resetModules();
});

describe("checkRateLimit", () => {
  it("allows first request", () => {
    const key = `test_${Date.now()}_${Math.random()}`;
    const result = checkRateLimit(key, { max: 5, windowSec: 60 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it("allows requests within limit", () => {
    const key = `test_within_${Date.now()}`;
    const config = { max: 3, windowSec: 60 };

    const r1 = checkRateLimit(key, config);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(key, config);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(key, config);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);
  });

  it("blocks requests exceeding limit", () => {
    const key = `test_exceed_${Date.now()}`;
    const config = { max: 2, windowSec: 60 };

    checkRateLimit(key, config);
    checkRateLimit(key, config);
    const r3 = checkRateLimit(key, config);

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
  });

  it("different keys are independent", () => {
    const key1 = `test_key1_${Date.now()}`;
    const key2 = `test_key2_${Date.now()}`;
    const config = { max: 1, windowSec: 60 };

    checkRateLimit(key1, config);
    const r1 = checkRateLimit(key1, config);
    const r2 = checkRateLimit(key2, config);

    expect(r1.allowed).toBe(false);
    expect(r2.allowed).toBe(true);
  });

  it("provides a reset timestamp in the future", () => {
    const key = `test_reset_${Date.now()}`;
    const result = checkRateLimit(key, { max: 5, windowSec: 60 });
    expect(result.resetAt).toBeGreaterThan(Date.now());
  });
});

describe("rateLimitResponse", () => {
  it("returns null when allowed", () => {
    const key = `resp_ok_${Date.now()}`;
    const result = rateLimitResponse(key, { max: 10, windowSec: 60 });
    expect(result).toBeNull();
  });

  it("returns a 429 Response when rate limited", () => {
    const key = `resp_limited_${Date.now()}`;
    const config = { max: 1, windowSec: 60 };

    rateLimitResponse(key, config); // use up the limit
    const result = rateLimitResponse(key, config);

    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it("includes Retry-After header", async () => {
    const key = `resp_retry_${Date.now()}`;
    const config = { max: 1, windowSec: 30 };

    rateLimitResponse(key, config);
    const result = rateLimitResponse(key, config);

    expect(result).not.toBeNull();
    const retryAfter = result!.headers.get("Retry-After");
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
    expect(Number(retryAfter)).toBeLessThanOrEqual(30);
  });

  it("returns proper JSON body", async () => {
    const key = `resp_body_${Date.now()}`;
    const config = { max: 1, windowSec: 60 };

    rateLimitResponse(key, config);
    const result = rateLimitResponse(key, config);

    const body = await result!.json();
    expect(body.error).toContain("Too many requests");
  });
});

describe("getClientIp", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "203.0.113.50, 70.41.3.18" },
    });
    expect(getClientIp(req)).toBe("203.0.113.50");
  });

  it("extracts IP from x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "192.168.1.1" },
    });
    expect(getClientIp(req)).toBe("192.168.1.1");
  });

  it("returns 'unknown' when no IP headers", () => {
    const req = new Request("http://localhost");
    expect(getClientIp(req)).toBe("unknown");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "10.0.0.1",
        "x-real-ip": "10.0.0.2",
      },
    });
    expect(getClientIp(req)).toBe("10.0.0.1");
  });
});

describe("RATE_LIMITS presets", () => {
  it("login limit is strict (5 per 60s)", () => {
    expect(RATE_LIMITS.login.max).toBe(5);
    expect(RATE_LIMITS.login.windowSec).toBe(60);
  });

  it("api limit is generous (100 per 60s)", () => {
    expect(RATE_LIMITS.api.max).toBe(100);
    expect(RATE_LIMITS.api.windowSec).toBe(60);
  });

  it("sensitive limit is moderate (10 per 5min)", () => {
    expect(RATE_LIMITS.sensitive.max).toBe(10);
    expect(RATE_LIMITS.sensitive.windowSec).toBe(300);
  });
});
