type LogLevel = "info" | "warn" | "error";

type EventDetails = Record<string, string | number | boolean | null | undefined>;

/** JSON logs are searchable as fields in Vercel Runtime Logs and log drains. */
export function logEvent(
  level: LogLevel,
  event: string,
  details: EventDetails = {},
) {
  const payload = JSON.stringify({
    level,
    event,
    timestamp: new Date().toISOString(),
    ...details,
  });

  if (level === "error") console.error(payload);
  else if (level === "warn") console.warn(payload);
  else console.log(payload);
}

export function requestContext(request: Request) {
  return {
    requestId:
      request.headers.get("x-vercel-id") ??
      request.headers.get("x-request-id") ??
      crypto.randomUUID(),
  };
}
