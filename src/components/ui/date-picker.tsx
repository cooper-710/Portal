"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type DatePickerProps = {
  id?: string;
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  onChange?: (value: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
};

function parseIsoDay(value: string | null | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDay(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplay(value: string | null) {
  const date = parseIsoDay(value);
  if (!date) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function DatePicker({
  id,
  name,
  value,
  defaultValue = null,
  onChange,
  required = false,
  disabled = false,
  placeholder = "Pick a date",
  className,
  allowClear = true,
}: DatePickerProps) {
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState<string | null>(
    defaultValue ?? null,
  );
  const selected = isControlled ? (value ?? null) : uncontrolled;
  const [open, setOpen] = useState(false);

  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const selectedDate = parseIsoDay(selected);
  const [cursor, setCursor] = useState(() => {
    const base = selectedDate ?? today;
    return { year: base.getFullYear(), month: base.getMonth() };
  });

  function setSelected(next: string | null) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
  }

  function shiftMonth(delta: number) {
    setCursor((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const display = formatDisplay(selected);

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selected ?? ""}
          required={required}
        />
      ) : null}

      <Popover
        open={open}
        onOpenChange={(next) => {
          if (disabled) return;
          setOpen(next);
          if (next) {
            const base = parseIsoDay(selected) ?? today;
            setCursor({ year: base.getFullYear(), month: base.getMonth() });
          }
        }}
      >
        <PopoverTrigger
          id={id}
          disabled={disabled}
          type="button"
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] hover:border-zinc-300 focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60",
            !display && "text-zinc-400",
          )}
          aria-required={required || undefined}
        >
          <CalendarDays className="size-4 shrink-0 text-blue-600" aria-hidden />
          <span className="min-w-0 flex-1 truncate">
            {display ?? placeholder}
          </span>
          {allowClear && selected && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              aria-label="Clear date"
              className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setSelected(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setSelected(null);
                }
              }}
            >
              <X className="size-3.5" />
            </span>
          ) : null}
        </PopoverTrigger>

        <PopoverContent className="w-[17.5rem] p-3" align="start">
          <div className="mb-2 flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Previous month"
            >
              <ChevronLeft className="size-4" />
            </button>
            <p className="min-w-[9rem] text-center text-sm font-semibold text-zinc-900">
              {monthLabel(cursor.year, cursor.month)}
            </p>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              className="inline-flex size-8 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Next month"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
              <span key={day}>{day}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1" role="grid">
            {Array.from({ length: firstWeekday }).map((_, index) => (
              <div key={`pad-${index}`} className="aspect-square" aria-hidden />
            ))}
            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const date = new Date(cursor.year, cursor.month, day);
              const key = toIsoDay(date);
              const isToday = key === toIsoDay(today);
              const isSelected = selected === key;

              return (
                <button
                  key={key}
                  type="button"
                  role="gridcell"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelected(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-lg text-xs font-medium tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    isSelected
                      ? "bg-blue-600 text-white shadow-sm"
                      : isToday
                        ? "border border-blue-200 bg-blue-50 text-blue-950 hover:bg-blue-100"
                        : "text-zinc-700 hover:bg-zinc-100",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between gap-2 border-t border-zinc-100 pt-2">
            <button
              type="button"
              className="text-xs font-medium text-blue-700 hover:underline"
              onClick={() => {
                const key = toIsoDay(today);
                setSelected(key);
                setCursor({
                  year: today.getFullYear(),
                  month: today.getMonth(),
                });
                setOpen(false);
              }}
            >
              Today
            </button>
            {allowClear ? (
              <button
                type="button"
                className="text-xs font-medium text-zinc-500 hover:text-zinc-800 hover:underline"
                onClick={() => {
                  setSelected(null);
                  setOpen(false);
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
