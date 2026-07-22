import { cn } from "@/lib/utils";

/** Shared classes for native `<select>` to match Portal inputs (zinc / blue). */
export function nativeSelectClassName(className?: string) {
  return cn(
    "flex h-9 w-full appearance-none rounded-lg border border-zinc-200 bg-white bg-[length:1rem] bg-[right_0.65rem_center] bg-no-repeat px-3 pr-9 text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60",
    "bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27%2371717a%27%3E%3Cpath fill-rule=%27evenodd%27 d=%27M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z%27 clip-rule=%27evenodd%27/%3E%3C/svg%3E')]",
    className,
  );
}

/** Shared classes for native date inputs (and similar). */
export function dateInputClassName(className?: string) {
  return cn(
    "h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] focus-visible:border-blue-300 focus-visible:ring-2 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60",
    "[&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-60 hover:[&::-webkit-calendar-picker-indicator]:opacity-100",
    className,
  );
}
