type OriginSubscription = {
  id: string;
  endpoint: string;
  origin: string | null;
};

export function normalizePushOrigin(value: string | null | undefined) {
  if (!value) return null;
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

export function eligiblePushSubscriptions<T extends OriginSubscription>(
  subscriptions: T[],
  canonicalOrigin: string,
) {
  const expected = normalizePushOrigin(canonicalOrigin);
  if (!expected) return [];
  return subscriptions.filter(
    (subscription) => normalizePushOrigin(subscription.origin) === expected,
  );
}

export function stalePushSubscriptionIds(
  subscriptions: OriginSubscription[],
  currentEndpoint: string,
  currentOrigin: string,
  canonicalOrigin: string,
) {
  const current = normalizePushOrigin(currentOrigin);
  const canonical = normalizePushOrigin(canonicalOrigin);
  if (!current || current !== canonical) return [];

  return subscriptions
    .filter(
      (subscription) =>
        subscription.endpoint !== currentEndpoint &&
        normalizePushOrigin(subscription.origin) !== canonical,
    )
    .map((subscription) => subscription.id);
}
