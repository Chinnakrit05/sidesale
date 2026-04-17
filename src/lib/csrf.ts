import { NextResponse } from "next/server";

/**
 * CSRF protection for mutation API routes.
 *
 * Validates that the request origin matches the expected host (Origin / Referer header check).
 * This is a defense-in-depth measure on top of SameSite cookies.
 *
 * Next.js >=15 also supports server actions with built-in CSRF but our API routes need manual protection.
 */
export function validateCsrf(req: Request): Response | null {
  const method = req.method.toUpperCase();

  // Only check state-changing methods
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return null;

  const origin = req.headers.get("origin");
  const host = req.headers.get("host");

  // If no origin header, check referer
  if (!origin) {
    const referer = req.headers.get("referer");
    if (!referer) {
      // Allow requests with no origin/referer (e.g., server-to-server, mobile apps)
      // but require at least a content-type header to block simple form submissions
      const contentType = req.headers.get("content-type") || "";
      if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("text/plain")
      ) {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        );
      }
      return null;
    }

    try {
      const refererHost = new URL(referer).host;
      if (host && refererHost !== host) {
        return NextResponse.json(
          { error: "CSRF validation failed" },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 }
      );
    }
    return null;
  }

  // Compare origin host with request host
  try {
    const originHost = new URL(origin).host;
    if (host && originHost !== host) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "CSRF validation failed" },
      { status: 403 }
    );
  }

  return null;
}
