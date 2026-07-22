import { logEvent } from "@/lib/monitoring";

export async function register() {
  logEvent("info", "application_started", {
    runtime: process.env.NEXT_RUNTIME ?? "nodejs",
  });
}

export function onRequestError(
  error: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  logEvent("error", "unhandled_request_error", {
    message: error instanceof Error ? error.message : String(error),
    path: request.path,
    method: request.method,
    route: context.routePath,
    routeType: context.routeType,
    requestId: request.headers["x-vercel-id"] ?? null,
  });
}
