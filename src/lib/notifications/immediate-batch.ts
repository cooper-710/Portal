export async function runImmediateDeliveryBatch<TDelivery>({
  materialize,
  loadDueDeliveries,
  deliver,
  now = () => new Date().toISOString(),
}: {
  materialize: () => Promise<number>;
  loadDueDeliveries: (cutoff: string) => Promise<TDelivery[]>;
  deliver: (delivery: TDelivery) => Promise<void>;
  now?: () => string;
}) {
  const events = await materialize();
  // This timestamp must be taken after materialization because Postgres applies
  // next_attempt_at = now() when each delivery row is inserted.
  const deliveries = await loadDueDeliveries(now());
  for (const delivery of deliveries) await deliver(delivery);
  return { events, deliveries: deliveries.length };
}

