import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: false,
      },
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({
            request: {
              headers: requestHeaders,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              supabaseResponse.headers.set(key, value);
            });
          }
        },
      },
    },
  );

  // Validate JWT, do not use getSession() for auth checks.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const pathname = request.nextUrl.pathname;
  const isDashboard = pathname.startsWith("/dashboard");
  const isOnboarding = pathname.startsWith("/onboarding");
  const isLogin = pathname.startsWith("/login");
  const isAuthFlow =
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/confirm") ||
    pathname.startsWith("/auth/continue");

  // Never intercept auth exchange routes, let them complete token handling.
  if (isAuthFlow) {
    return supabaseResponse;
  }

  if ((isDashboard || isOnboarding) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    url.searchParams.set("auth", "signin");
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Allow login page when an auth error is present so users can recover.
  // /login itself redirects to /?auth=…, if already signed in, continue.
  if (isLogin && user && !request.nextUrl.searchParams.get("error")) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/continue";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Landing with auth modal while already signed in → continue into app.
  if (
    pathname === "/" &&
    user &&
    request.nextUrl.searchParams.get("auth") &&
    !request.nextUrl.searchParams.get("error")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/continue";
    url.search = "";
    const next = request.nextUrl.searchParams.get("next");
    if (next?.startsWith("/")) {
      url.searchParams.set("next", next);
    }
    const role = request.nextUrl.searchParams.get("role");
    if (role === "client") {
      url.searchParams.set("role", "client");
    }
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
