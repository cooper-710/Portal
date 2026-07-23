"use client";

import { BellRing, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import type { NotificationPreferences } from "@/types/database";

function base64Key(value: string) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replaceAll("-", "+").replaceAll("_", "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map((character) => character.charCodeAt(0)));
}

const categoryFields = [
  ["invites_enabled", "Invites"],
  ["reviews_enabled", "Reviews and approvals"],
  ["invoices_enabled", "Invoices and reminders"],
  ["payments_enabled", "Payments, refunds, and disputes"],
  ["projects_enabled", "Project closeout"],
] as const;

export function NotificationPreferencesForm() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/notifications/preferences", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: { preferences?: NotificationPreferences; error?: string }) => {
        if (data.preferences) {
          setPreferences({
            ...data.preferences,
            timezone: data.preferences.timezone === "UTC"
              ? Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"
              : data.preferences.timezone,
          });
        } else if (data.error) setMessage(data.error);
      });
  }, []);

  async function save(next = preferences) {
    if (!next) return;
    setSaving(true);
    setMessage(null);
    const response = await fetch("/api/notifications/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await response.json() as { preferences?: NotificationPreferences; error?: string };
    setSaving(false);
    if (!response.ok || !data.preferences) setMessage(data.error ?? "Could not save preferences.");
    else { setPreferences(data.preferences); setMessage("Notification preferences saved."); }
  }

  async function togglePush() {
    if (!preferences) return;
    setPushBusy(true);
    setMessage(null);
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) throw new Error("This browser does not support push notifications.");
      const registration = await navigator.serviceWorker.register("/push-sw.js");
      const existing = await registration.pushManager.getSubscription();
      if (preferences.push_enabled) {
        if (existing) {
          await fetch("/api/notifications/push-subscriptions", {
            method: "DELETE", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: existing.endpoint }),
          });
          await existing.unsubscribe();
        }
        const next = { ...preferences, push_enabled: false };
        setPreferences(next);
        setMessage("Browser push turned off.");
      } else {
        const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!publicKey) throw new Error("Browser push is not configured on this deployment yet.");
        const permission = await Notification.requestPermission();
        if (permission !== "granted") throw new Error("Browser notification permission was not granted.");
        const subscription = existing ?? await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: base64Key(publicKey),
        });
        const response = await fetch("/api/notifications/push-subscriptions", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription.toJSON()),
        });
        if (!response.ok) throw new Error("Could not save the browser subscription.");
        const next = { ...preferences, push_enabled: true };
        setPreferences(next);
        setMessage("Browser push turned on for this device.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update browser push.");
    } finally {
      setPushBusy(false);
    }
  }

  if (!preferences) return <div className="flex h-20 items-center justify-center text-zinc-400"><Loader2 className="size-5 animate-spin" /></div>;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {(["in_app_enabled", "email_enabled"] as const).map((field) => (
          <label key={field} className="flex items-center gap-3 rounded-xl border border-zinc-200 p-3 text-sm text-zinc-700">
            <input type="checkbox" className="size-4 accent-orange-500" checked={preferences[field]} onChange={(event) => setPreferences({ ...preferences, [field]: event.target.checked })} />
            {field === "in_app_enabled" ? "In-app notifications" : "Email notifications"}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <BellRing className="mt-0.5 size-4 text-zinc-500" />
          <div><p className="text-sm font-medium text-zinc-800">Browser push</p><p className="text-xs text-zinc-500">Opt in on each device where you want alerts.</p></div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void togglePush()} disabled={pushBusy}>
          {pushBusy ? <Loader2 className="size-3.5 animate-spin" /> : null}
          {preferences.push_enabled ? "Turn off" : "Turn on"}
        </Button>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Notify me about</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {categoryFields.map(([field, label]) => (
            <label key={field} className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" className="size-4 accent-orange-500" checked={preferences[field]} onChange={(event) => setPreferences({ ...preferences, [field]: event.target.checked })} />
              {label}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3 border-t border-zinc-100 pt-4">
        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
          <input type="checkbox" className="size-4 accent-orange-500" checked={preferences.quiet_hours_enabled} onChange={(event) => setPreferences({ ...preferences, quiet_hours_enabled: event.target.checked })} />
          Use quiet hours
        </label>
        {preferences.quiet_hours_enabled ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs text-zinc-500">From<input type="time" className="mt-1 block w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm text-zinc-800" value={preferences.quiet_hours_start.slice(0, 5)} onChange={(event) => setPreferences({ ...preferences, quiet_hours_start: event.target.value })} /></label>
            <label className="text-xs text-zinc-500">Until<input type="time" className="mt-1 block w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm text-zinc-800" value={preferences.quiet_hours_end.slice(0, 5)} onChange={(event) => setPreferences({ ...preferences, quiet_hours_end: event.target.value })} /></label>
            <label className="text-xs text-zinc-500">Timezone<input type="text" className="mt-1 block w-full rounded-lg border border-zinc-200 px-2.5 py-2 text-sm text-zinc-800" value={preferences.timezone} onChange={(event) => setPreferences({ ...preferences, timezone: event.target.value })} /></label>
          </div>
        ) : null}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500" role="status">{message}</p>
        <Button type="button" size="sm" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : null} Save notifications
        </Button>
      </div>
    </div>
  );
}
