"use client";

import { useId, useState } from "react";
import { Check, ChevronDown } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
};

type SelectProps = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  triggerClassName?: string;
  contentClassName?: string;
  /** Prefer brand CSS variables for focus/selected (client portal chrome). */
  branded?: boolean;
  "aria-label"?: string;
};

export function Select({
  id,
  name,
  value,
  defaultValue = "",
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  required = false,
  className,
  triggerClassName,
  contentClassName,
  branded = false,
  "aria-label": ariaLabel,
}: SelectProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const selected = isControlled ? (value ?? "") : uncontrolled;
  const [open, setOpen] = useState(false);

  const selectedOption = options.find((option) => option.value === selected);
  const display = selectedOption?.label;

  function setSelected(next: string) {
    if (!isControlled) setUncontrolled(next);
    onChange?.(next);
    setOpen(false);
  }

  const accentSelected = branded
    ? "bg-[color:var(--brand-primary-soft)] text-zinc-900 ring-1 ring-inset ring-[color:var(--brand-primary)]/25"
    : "bg-blue-50 text-blue-950 ring-1 ring-inset ring-blue-200/80";
  const accentCheck = branded
    ? "text-[color:var(--brand-primary)]"
    : "text-blue-600";
  const accentFocus = branded
    ? "focus-visible:border-[color:var(--brand-primary)]/40 focus-visible:ring-[color:var(--brand-primary)]/20"
    : "focus-visible:border-blue-300 focus-visible:ring-blue-100";
  const optionFocus = branded
    ? "focus-visible:ring-[color:var(--brand-primary)]/35"
    : "focus-visible:ring-blue-500";

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={selected}
          required={required}
        />
      ) : null}

      <Popover
        open={open}
        onOpenChange={(next) => {
          if (disabled) return;
          setOpen(next);
        }}
      >
        <PopoverTrigger
          id={fieldId}
          disabled={disabled}
          type="button"
          aria-label={ariaLabel}
          aria-required={required || undefined}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-left text-sm text-zinc-900 shadow-sm outline-none transition-[border-color,box-shadow] hover:border-zinc-300 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60",
            accentFocus,
            !display && "text-zinc-400",
            triggerClassName,
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {display ?? placeholder}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-zinc-400 transition-transform",
              open && "rotate-180",
            )}
            aria-hidden
          />
        </PopoverTrigger>

        <PopoverContent
          className={cn(
            "w-[var(--anchor-width)] min-w-[12rem] overflow-visible p-0",
            contentClassName,
          )}
          align="start"
        >
          <ul
            role="listbox"
            aria-labelledby={fieldId}
            className="max-h-60 space-y-0.5 overflow-y-auto overscroll-contain p-2"
          >
            {options.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-zinc-500">No options</li>
            ) : (
              options.map((option) => {
                const isSelected = option.value === selected;
                return (
                  <li key={option.value} role="option" aria-selected={isSelected}>
                    <button
                      type="button"
                      disabled={option.disabled || disabled}
                      onClick={() => setSelected(option.value)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50",
                        optionFocus,
                        isSelected
                          ? accentSelected
                          : "text-zinc-800 hover:bg-zinc-100",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {option.label}
                        </span>
                        {option.description ? (
                          <span className="mt-0.5 block truncate text-xs font-normal text-zinc-500">
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {isSelected ? (
                        <Check
                          className={cn("mt-0.5 size-4 shrink-0", accentCheck)}
                          aria-hidden
                        />
                      ) : (
                        <span className="size-4 shrink-0" aria-hidden />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </PopoverContent>
      </Popover>
    </div>
  );
}
