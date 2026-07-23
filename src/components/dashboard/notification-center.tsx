"use client";

import { Bell, CheckCheck, Loader2, Trash2 } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  ensurePushSubscription,
  supportsBrowserPush,
} from "@/lib/notifications/browser-push";
import { mergeLiveNotification } from "@/lib/notifications/live-state";
import type { Notification } from "@/types/database";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(value)) / 1000));
  if (seconds < 60) return "Now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function NotificationCenter({ userId }: { userId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [items, setItems] = useState<Notification[]>([]);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/notifications", { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json() as { notifications?: Notification[] };
      setItems(data.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load, pathname]);
  useEffect(() => {
    if (
      !supportsBrowserPush() ||
      Notification.permission !== "granted"
    ) {
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) return;
    let cancelled = false;
    const controller = new AbortController();

    void (async () => {
      const preferenceResponse = await fetch(
        "/api/notifications/preferences",
        { cache: "no-store", signal: controller.signal },
      );
      if (!preferenceResponse.ok || cancelled) return;
      const preferenceData = await preferenceResponse.json() as {
        preferences?: { push_enabled?: boolean };
      };
      if (!preferenceData.preferences?.push_enabled) return;

      const subscription = await ensurePushSubscription(publicKey);
      if (cancelled) return;
      await fetch("/api/notifications/push-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription.toJSON()),
        signal: controller.signal,
      });
    })().catch(() => {
      // Settings exposes actionable push errors. Background origin migration
      // stays silent so it never disrupts normal dashboard navigation.
    });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [userId]);
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const removed = payload.old as Partial<Notification>;
            if (removed.id) setItems((current) => current.filter((item) => item.id !== removed.id));
            return;
          }
          const notification = payload.new as Notification;
          if (notification?.id) {
            setItems((current) => mergeLiveNotification(current, notification));
            setLoading(false);
          }
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void load();
      });

    // Realtime can be interrupted by sleeping laptops, proxies, or publication
    // configuration. Polling and focus refresh provide a bounded fallback.
    const poll = window.setInterval(() => void load(), 30_000);
    const refresh = () => void load();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(poll);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      void supabase.removeChannel(channel);
    };
  }, [load, userId]);
  useEffect(() => {
    function close(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const unread = items.filter((item) => !item.read_at).length;

  async function markRead(id?: string) {
    const now = new Date().toISOString();
    setItems((current) => current.map((item) =>
      (!id || item.id === id) ? { ...item, read_at: item.read_at ?? now } : item,
    ));
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(id ? { id } : { all: true }),
    });
  }

  async function openNotification(item: Notification) {
    if (!item.read_at) await markRead(item.id);
    setOpen(false);
    router.push(item.href);
  }

  async function deleteNotification(id: string) {
    setDeletingId(id);
    const previous = items;
    setItems((current) => current.filter((item) => item.id !== id));
    try {
      const response = await fetch("/api/notifications", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!response.ok) {
        setItems(previous);
        void load();
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="relative" ref={rootRef}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="relative size-8 text-zinc-600"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-live="polite"
        aria-expanded={open}
        onClick={() => { setOpen((value) => !value); if (!open) void load(); }}
      >
        <Bell className="size-4" />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold leading-4 text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </Button>

      {open ? (
        <div className="absolute right-0 top-10 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Notifications</p>
              <p className="text-xs text-zinc-500">{unread ? `${unread} unread` : "You’re all caught up"}</p>
            </div>
            {unread ? (
              <button type="button" onClick={() => void markRead()} className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900">
                <CheckCheck className="size-3.5" /> Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-72 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="flex items-center justify-center p-8 text-zinc-400"><Loader2 className="size-5 animate-spin" /></div>
            ) : items.length === 0 ? (
              <p className="p-8 text-center text-sm text-zinc-500">Project and payment updates will appear here.</p>
            ) : items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "flex h-24 w-full items-start gap-2 border-b border-zinc-100 px-4 py-3 transition-colors last:border-0 hover:bg-zinc-50",
                  !item.read_at && "bg-orange-50/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => void openNotification(item)}
                  className="flex min-w-0 flex-1 gap-3 text-left"
                >
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", item.read_at ? "bg-zinc-200" : "bg-orange-500")} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-zinc-900">{item.title}</span>
                    <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-zinc-500">{item.body}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-medium text-zinc-400">{timeAgo(item.created_at)}</span>
                </button>
                <button
                  type="button"
                  onClick={() => void deleteNotification(item.id)}
                  disabled={deletingId !== null}
                  aria-label={`Delete ${item.title}`}
                  className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                >
                  {deletingId === item.id
                    ? <Loader2 className="size-3.5 animate-spin" />
                    : <Trash2 className="size-3.5" />}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
