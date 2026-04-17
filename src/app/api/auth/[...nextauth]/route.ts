import { handlers } from "@/auth";
import { getClientIp, rateLimitResponse, RATE_LIMITS } from "@/lib/rate-limit";

const { GET: originalGET, POST: originalPOST } = handlers;

export { originalGET as GET };

// Wrap POST to rate-limit login (credentials) attempts
export async function POST(req: Request) {
  const url = new URL(req.url);
  const isSignIn = url.pathname.includes("callback/credentials") || url.pathname.includes("signin");

  if (isSignIn) {
    const ip = getClientIp(req);
    const limited = rateLimitResponse(`auth:${ip}`, RATE_LIMITS.login);
    if (limited) return limited;
  }

  return (originalPOST as any)(req);
}
