"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

import { cn } from "@/lib/utils";

/** Shared max height so Overview / Home grid cards stay balanced. */
export const DASHBOARD_CARD_MAX_H = "max-h-[28rem]";

type DashboardCardProps = {
  children: ReactNode;
  className?: string;
  /** When false, card sizes to content up to max height. Default true for grid peers. */
  fillHeight?: boolean;
  /** When false, card grows with content and is not height-capped. */
  constrainHeight?: boolean;
};

export function DashboardCard({
  children,
  className,
  fillHeight = true,
  constrainHeight = true,
}: DashboardCardProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-2xl border shadow-sm",
        constrainHeight && DASHBOARD_CARD_MAX_H,
        fillHeight && constrainHeight && "h-full",
        className,
      )}
    >
      {children}
    </section>
  );
}

type DashboardCardHeaderProps = {
  children: ReactNode;
  className?: string;
};

export function DashboardCardHeader({
  children,
  className,
}: DashboardCardHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-10 shrink-0 border-b border-zinc-200/60 bg-inherit px-4 py-4 sm:px-5",
        className,
      )}
    >
      {children}
    </div>
  );
}

function isOverflowing(el: HTMLElement) {
  return el.scrollHeight > el.clientHeight + 1;
}

function scrollPageBy(deltaY: number) {
  const scrollingElement =
    (document.scrollingElement as HTMLElement | null) ??
    document.documentElement;
  scrollingElement.scrollTop += deltaY;
}

/**
 * Attach a non-passive wheel listener so we can pass scroll to the page
 * when the pane is not overflowed or the wheel would not move it.
 */
function useWheelPassThrough(
  ref: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;

    const onWheel = (event: globalThis.WheelEvent) => {
      if (!isOverflowing(el)) {
        // overflow-y is hidden in this case; nothing to do.
        return;
      }

      const { scrollTop, scrollHeight, clientHeight } = el;
      const deltaY = event.deltaY;
      if (deltaY === 0) return;

      const atTop = scrollTop <= 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1;
      const scrollingDown = deltaY > 0;

      if ((scrollingDown && atBottom) || (!scrollingDown && atTop)) {
        event.preventDefault();
        scrollPageBy(deltaY);
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [ref, enabled]);
}

function useOverflowNeedsScroll(
  ref: RefObject<HTMLDivElement | null>,
  enabled: boolean,
) {
  const [needsScroll, setNeedsScroll] = useState(false);

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el || !enabled) {
      setNeedsScroll(false);
      return;
    }
    setNeedsScroll(isOverflowing(el));
  }, [ref, enabled]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    measure();

    const observer = new ResizeObserver(() => {
      measure();
    });
    observer.observe(el);
    for (const child of Array.from(el.children)) {
      observer.observe(child);
    }

    return () => observer.disconnect();
  }, [measure]);

  return { needsScroll, measure };
}

type DashboardCardBodyProps = {
  children: ReactNode;
  className?: string;
  /**
   * When false, body never becomes an inner scroller (full content, page scrolls).
   * Default true: overflow scroll only when content exceeds the body.
   */
  scrollable?: boolean;
};

/**
 * Card body that only enables overflow scrolling when content actually overflows,
 * and passes mouse-wheel to the page when not scrollable or when already at an edge.
 */
export function DashboardCardBody({
  children,
  className,
  scrollable = true,
}: DashboardCardBodyProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { needsScroll } = useOverflowNeedsScroll(ref, scrollable);
  useWheelPassThrough(ref, scrollable && needsScroll);

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-0 flex-1 px-4 py-4 sm:px-5",
        scrollable && needsScroll
          ? "overflow-y-auto overscroll-contain"
          : "overflow-y-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

type ScrollPaneProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Nested scroll region with the same overflow detection and wheel pass-through
 * as DashboardCardBody (e.g. calendar agenda list).
 */
export function ScrollPane({ children, className }: ScrollPaneProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { needsScroll } = useOverflowNeedsScroll(ref, true);
  useWheelPassThrough(ref, needsScroll);

  return (
    <div
      ref={ref}
      className={cn(
        "min-h-0",
        needsScroll
          ? "overflow-y-auto overscroll-contain"
          : "overflow-y-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}
