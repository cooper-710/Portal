import { NextResponse } from "next/server";

import { resolvePostAuthPath } from "@/utils/supabase/post-auth";

/**
 * Post-auth router used after client-side OTP verify / confirm flows,
 * and when a signed-in user hits /login or /?auth=….
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const preferredRole =
    searchParams.get("role") === "client" ? ("client" as const) : null;
  const destination = await resolvePostAuthPath(next, { preferredRole });
  return NextResponse.redirect(`${origin}${destination}`);
}
