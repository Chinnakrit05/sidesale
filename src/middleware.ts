import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req: any) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const role = req.auth?.user?.role;
  const pathname = nextUrl.pathname;

  // --- CSRF protection for mutation requests on API routes ---
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/auth")) {
    const method = req.method?.toUpperCase();
    if (method && !["GET", "HEAD", "OPTIONS"].includes(method)) {
      const origin = req.headers.get("origin");
      const host = req.headers.get("host");

      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (host && originHost !== host) {
            return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
          }
        } catch {
          return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
        }
      } else {
        // No origin header — check referer
        const referer = req.headers.get("referer");
        if (referer) {
          try {
            const refererHost = new URL(referer).host;
            if (host && refererHost !== host) {
              return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
            }
          } catch {
            return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
          }
        } else {
          // Block simple form POST with no origin/referer (cross-site form attacks)
          const ct = req.headers.get("content-type") || "";
          if (ct.includes("application/x-www-form-urlencoded") || ct.includes("text/plain")) {
            return NextResponse.json({ error: "CSRF validation failed" }, { status: 403 });
          }
        }
      }
    }
  }

  // --- Security headers ---
  const response = NextResponse.next();
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  const isPublic =
    pathname === "/login" ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/";

  if (!isLoggedIn && !isPublic) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  if (isLoggedIn && pathname === "/login") {
    const dest = role === "OWNER" ? "/dashboard" : "/pos";
    return NextResponse.redirect(new URL(dest, nextUrl));
  }

  // Owner-only routes
  const ownerRoutes = ["/dashboard", "/products", "/categories", "/customers", "/stock", "/staff", "/reports", "/audit", "/settings"];
  if (isLoggedIn && role !== "OWNER" && ownerRoutes.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/pos", nextUrl));
  }

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
