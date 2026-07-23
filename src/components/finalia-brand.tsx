import Image from "next/image";

import { PRODUCT_NAME } from "@/lib/product";
import { cn } from "@/lib/utils";

type FinaliaBrandProps = {
  className?: string;
  nameClassName?: string;
  size?: "sm" | "md" | "lg" | "hero";
};

const iconSizes = {
  sm: 24,
  md: 32,
  lg: 44,
  hero: 72,
} as const;

export function FinaliaBrand({
  className,
  nameClassName,
  size = "md",
}: FinaliaBrandProps) {
  const iconSize = iconSizes[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/finalia-icon.png"
        width={iconSize}
        height={iconSize}
        sizes={`${iconSize}px`}
        alt=""
        className="shrink-0"
        priority={size === "hero"}
      />
      <span className={nameClassName}>{PRODUCT_NAME}</span>
    </span>
  );
}
