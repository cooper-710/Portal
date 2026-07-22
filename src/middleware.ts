import { type NextRequest, NextResponse } from "next/server";

import { rateLimit, rateLimitHeaders } from "@/lib/rate-limit";
import { updateSession } from "@/utils/supabase/middleware";

/**
 * Session refresh for Supabase Auth.
 *
 * Rate limiting: auth endpoints are primarily Supabase-hosted (signIn/signUp
 * from the browser SDK). App Route Handlers under /api/* should add edge
 * rate limits (e.g. Upstash) before public abuse becomes material, tracked
 * as P1 in PRODUCTION_PLAN.md. Do not block Stripe webhooks.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isWebhook = pathname === "/api/webhooks/stripe";
  const shouldLimit =
    !isWebhook &&
    (pathname.startsWith("/api/") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/auth/"));

  if (shouldLimit) {
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const identity = forwarded || request.headers.get("x-real-ip") || "unknown";
    const sensitive =
      pathname.startsWith("/auth/") ||
      pathname.startsWith("/login") ||
      pathname.includes("checkout") ||
      pathname.startsWith("/api/stripe/");
    const result = await rateLimit(`${identity}:${pathname}`, {
      limit: sensitive ? 20 : 90,
      windowSeconds: sensitive ? 600 : 60,
    });

    if (!result.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait and try again." },
        {
          status: 429,
          headers: {
            ...rateLimitHeaders(result),
            "Retry-After": String(
              Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000)),
            ),
          },
        },
      );
    }
  }

  // Cheap bot/noise filter on auth pages only (not a full rate limiter).
  if (pathname.startsWith("/login")) {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua.trim()) {
      return new NextResponse("Bad Request", { status: 400 });
    }
  }

  const response = await updateSession(request);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
