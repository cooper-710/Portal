"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  DashboardCard,
  DashboardCardBody,
  DashboardCardHeader,
} from "@/components/dashboard/dashboard-card";
import type { InvoiceWithProject } from "@/lib/dashboard-data";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export type PaymentDueItem = {
  id: string;
  dueDate: string;
  amount: number;
  currency: string;
  label: string;
  projectTitle: string;
  href: string;
};

type PaymentDueCalendarProps = {
  invoices: InvoiceWithProject[];
  /** Owner links to project; client links to invoices by default. */
  linkMode?: "project" | "invoices";
  className?: string;
  compact?: boolean;
};

function parseDueDate(value: string) {
  const date = new Date(value.includes("T") ? value : `${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(value: string) {
  const date = parseDueDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatDayAria(value: string) {
  const date = parseDueDate(value);
  if (!date) return value;
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function invoicesToPaymentDueItems(
  invoices: InvoiceWithProject[],
  linkMode: "project" | "invoices" = "project",
): PaymentDueItem[] {
  return invoices
    .filter((invoice) => invoice.status === "pending" && invoice.due_date)
    .map((invoice) => ({
      id: invoice.id,
      dueDate: invoice.due_date!,
      amount: invoice.amount,
      currency: invoice.currency,
      label: invoice.title?.trim() || "Payment due",
      projectTitle: invoice.project?.title ?? "Project",
      href:
        linkMode === "invoices"
          ? "/dashboard/invoices"
          : `/dashboard/projects/${invoice.project_id}`,
    }))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
}

export function PaymentDueCalendar({
  invoices,
  linkMode = "project",
  className,
  compact = false,
}: PaymentDueCalendarProps) {
  const items = useMemo(
    () => invoicesToPaymentDueItems(invoices, linkMode),
    [invoices, linkMode],
  );

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const [cursor, setCursor] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const dueByDay = useMemo(() => {
    const map = new Map<string, PaymentDueItem[]>();
    for (const item of items) {
      const date = parseDueDate(item.dueDate);
      if (!date) continue;
      const key = toIsoDay(date);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }, [items]);

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();

  const monthItems = items.filter((item) => {
    const date = parseDueDate(item.dueDate);
    return (
      date &&
      date.getFullYear() === cursor.year &&
      date.getMonth() === cursor.month
    );
  });

  const upcoming = items.filter((item) => {
    const date = parseDueDate(item.dueDate);
    return date && date >= today;
  });

  const overdue = items.filter((item) => {
    const date = parseDueDate(item.dueDate);
    return date && date < today;
  });

  const selectedItems = selectedDay ? (dueByDay.get(selectedDay) ?? []) : null;

  const listItems =
    selectedItems ??
    (monthItems.length > 0
      ? monthItems
      : [...overdue, ...upcoming].slice(0, 6));

  const listHeading = selectedDay
    ? `${formatShortDate(selectedDay)} · ${selectedItems?.length ?? 0} due`
    : monthItems.length > 0
      ? "This month"
      : "Upcoming";

  function shiftMonth(delta: number) {
    setSelectedDay(null);
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function toggleDay(key: string) {
    setSelectedDay((current) => (current === key ? null : key));
  }

  return (
    <DashboardCard
      className={cn("border-zinc-200/80 bg-white", className)}
    >
      <DashboardCardHeader className="bg-white">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/80 bg-zinc-50 px-2.5 py-1 text-xs font-medium text-zinc-600">
              <CalendarDays className="size-3.5 text-blue-600" />
              Payment due
            </div>
            <p className="text-sm text-zinc-500">
              {items.length === 0
                ? "No unpaid invoices with due dates"
                : `${items.length} unpaid · ${overdue.length} overdue`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-[9.5rem] text-center text-sm font-semibold text-zinc-900">
              {monthLabel(cursor.year, cursor.month)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </DashboardCardHeader>

      <DashboardCardBody
        className={cn(
          "grid gap-4",
          compact ? "" : "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]",
        )}
      >
        <div>
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1" role="grid" aria-label="Payment due calendar">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square" aria-hidden />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const date = new Date(cursor.year, cursor.month, day);
              const key = toIsoDay(date);
              const dayItems = dueByDay.get(key) ?? [];
              const isToday = key === toIsoDay(today);
              const isPast = date < today;
              const hasDue = dayItems.length > 0;
              const isSelected = selectedDay === key;

              const cellClass = cn(
                "relative flex aspect-square flex-col items-center justify-center rounded-lg border text-xs transition-colors",
                hasDue
                  ? isPast
                    ? "border-amber-200 bg-amber-50 text-amber-950"
                    : "border-blue-200 bg-blue-50 text-blue-950"
                  : "border-transparent text-zinc-600",
                isToday && !isSelected && "ring-2 ring-blue-500/40",
                isSelected &&
                  "ring-2 ring-blue-600 ring-offset-1 ring-offset-white",
                hasDue &&
                  "cursor-pointer hover:brightness-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
              );

              if (hasDue) {
                const countLabel =
                  dayItems.length === 1
                    ? "1 payment due"
                    : `${dayItems.length} payments due`;
                return (
                  <button
                    key={key}
                    type="button"
                    role="gridcell"
                    aria-pressed={isSelected}
                    aria-label={`${formatDayAria(key)}, ${countLabel}. ${
                      isSelected ? "Selected. Activate to clear." : "Activate to show invoices."
                    }`}
                    onClick={() => toggleDay(key)}
                    className={cellClass}
                    title={dayItems
                      .map(
                        (item) =>
                          `${formatMoney(item.amount, item.currency)} · ${item.projectTitle}`,
                      )
                      .join(", ")}
                  >
                    <span className="font-medium tabular-nums">{day}</span>
                    <span
                      className={cn(
                        "mt-0.5 size-1.5 rounded-full",
                        isPast ? "bg-amber-500" : "bg-blue-600",
                      )}
                    />
                  </button>
                );
              }

              return (
                <div
                  key={key}
                  role="gridcell"
                  className={cellClass}
                  aria-label={formatDayAria(key)}
                >
                  <span className="font-medium tabular-nums">{day}</span>
                </div>
              );
            })}
          </div>
          {items.length > 0 ? (
            <p className="mt-2 text-[11px] text-zinc-400">
              Click a highlighted day to see due invoices.
            </p>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-400">
              {listHeading}
            </p>
            {selectedDay ? (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-[11px] font-medium text-blue-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1"
              >
                Show all
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              className="border-0 bg-transparent py-4"
              title="Nothing due"
              description="Unpaid invoices with due dates will appear on this calendar."
            />
          ) : listItems.length === 0 && !selectedDay && overdue.length === 0 ? (
            <p className="text-sm text-zinc-500">No payments due this month.</p>
          ) : listItems.length === 0 && selectedDay ? (
            <p className="text-sm text-zinc-500">No payments due on this day.</p>
          ) : (
            <ul className="grid gap-2">
              {listItems.map((item) => {
                const date = parseDueDate(item.dueDate);
                const isPast = Boolean(date && date < today);
                return (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className={cn(
                        "group flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-all hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1",
                        isPast
                          ? "border-amber-200/80 bg-amber-50/50 hover:border-amber-300"
                          : "border-zinc-200/80 bg-zinc-50/40 hover:border-blue-200 hover:bg-white",
                      )}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {formatMoney(item.amount, item.currency)}
                          <span className="font-medium text-zinc-500">
                            {" · "}
                            {item.label}
                          </span>
                        </p>
                        <p className="truncate text-[11px] text-zinc-500">
                          {item.projectTitle} · {formatShortDate(item.dueDate)}
                          {isPast ? " · overdue" : ""}
                        </p>
                      </div>
                      <span className="shrink-0 text-[11px] font-medium text-blue-700 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        Open
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </DashboardCardBody>
    </DashboardCard>
  );
}
