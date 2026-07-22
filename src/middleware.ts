import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/utils/supabase/middleware";

/**
 * Session refresh for Supabase Auth.
 *
 * Rate limiting: auth endpoints are primarily Supabase-hosted (signIn/signUp
 * from the browser SDK). App Route Handlers under /api/* should add edge
 * rate limits (e.g. Upstash) before public abuse becomes material — tracked
 * as P1 in PRODUCTION_PLAN.md. Do not block Stripe webhooks.
 */
export async function middleware(request: NextRequest) {
  // Cheap bot/noise filter on auth pages only (not a full rate limiter).
  if (request.nextUrl.pathname.startsWith("/login")) {
    const ua = request.headers.get("user-agent") ?? "";
    if (!ua.trim()) {
      return new NextResponse("Bad Request", { status: 400 });
    }
  }

  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
