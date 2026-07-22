import { NextResponse } from "next/server";

import { resolvePostAuthPath } from "@/utils/supabase/post-auth";

/**
 * Post-auth router used after client-side OTP verify / confirm flows.
 * Sends first-time magic-link users to password setup when needed.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get("next") ?? "/dashboard";
  const destination = await resolvePostAuthPath(next);
  return NextResponse.redirect(`${origin}${destination}`);
}
