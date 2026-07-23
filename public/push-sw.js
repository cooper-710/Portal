self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Portal", body: event.data?.text() ?? "You have a new update." };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Portal", {
      body: data.body || "You have a new update.",
      icon: "/portal-icon-192.png",
      badge: "/portal-icon-192.png",
      data: { url: data.url || "/dashboard" },
      tag: data.url || "portal-notification",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/dashboard", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url === target && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(target);
    }),
  );
});
