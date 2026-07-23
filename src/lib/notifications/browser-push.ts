export function supportsBrowserPush() {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    "serviceWorker" in navigator &&
    "PushManager" in window
  );
}

function base64Key(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from(
    [...raw].map((character) => character.charCodeAt(0)),
  );
}

export async function getPushRegistration() {
  if (!supportsBrowserPush()) {
    throw new Error("This browser does not support push notifications.");
  }
  const registration = await navigator.serviceWorker.register("/push-sw.js", {
    updateViaCache: "none",
  });
  await registration.update().catch(() => undefined);
  return registration;
}

export async function ensurePushSubscription(publicKey: string) {
  const registration = await getPushRegistration();
  const existing = await registration.pushManager.getSubscription();
  if (existing) return existing;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64Key(publicKey),
  });
}
