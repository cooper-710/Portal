export type NotificationEnvironment = Record<string, string | undefined>;

function enabled(value: string | undefined, fallback = true) {
  return value == null
    ? fallback
    : !["0", "false", "off", "disabled"].includes(value.trim().toLowerCase());
}

/** Operational kill switches are opt-out: an unset variable keeps delivery on. */
export function resolveNotificationSwitches(environment: NotificationEnvironment) {
  return {
    all: enabled(environment.NOTIFICATIONS_ENABLED),
    email: enabled(environment.NOTIFICATION_EMAILS_ENABLED),
    push: enabled(environment.NOTIFICATION_PUSH_ENABLED),
  };
}

export function notificationKillSwitches() {
  return resolveNotificationSwitches(process.env);
}

