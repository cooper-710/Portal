import { NextResponse } from "next/server";

import {
  envPresenceReport,
  getMissingCriticalEnv,
  isProductionRuntime,
} from "@/utils/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Liveness + basic config presence. Never returns secret values.
 * Use after deploy: GET /api/health → { ok: true }
 */
export async function GET() {
  const presence = envPresenceReport();
  const missingCritical = getMissingCriticalEnv();
  const production = isProductionRuntime();
  const ok = !production || missingCritical.length === 0;

  return NextResponse.json(
    {
      ok,
      status: ok ? "healthy" : "misconfigured",
      timestamp: new Date().toISOString(),
      runtime: production ? "production" : "development",
      checks: {
        supabaseUrl: presence.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnon: presence.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceRole: presence.SUPABASE_SERVICE_ROLE_KEY,
        stripeSecret: presence.STRIPE_SECRET_KEY,
        stripeWebhookSecret: presence.STRIPE_WEBHOOK_SECRET,
        stripeSaasPrice: presence.STRIPE_SAAS_PRICE_ID,
        appUrl: presence.NEXT_PUBLIC_APP_URL,
        stripePublishable: presence.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        resend: presence.RESEND_API_KEY,
        distributedRateLimit: Boolean(
          (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) ||
            (process.env.UPSTASH_REDIS_REST_URL &&
              process.env.UPSTASH_REDIS_REST_TOKEN),
        ),
        vercelTelemetry: true,
      },
      ...(ok
        ? {}
        : {
            missingCritical,
            hint: "Set the missing env vars in Vercel (or your host) and redeploy.",
          }),
    },
    { status: ok ? 200 : 503 },
  );
}
