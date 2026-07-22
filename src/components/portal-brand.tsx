import Image from "next/image";

import { cn } from "@/lib/utils";

type PortalBrandProps = {
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

export function PortalBrand({
  className,
  nameClassName,
  size = "md",
}: PortalBrandProps) {
  const iconSize = iconSizes[size];

  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/portal-icon.png"
        width={iconSize}
        height={iconSize}
        sizes={`${iconSize}px`}
        alt=""
        className="shrink-0"
        priority={size === "hero"}
      />
      <span className={nameClassName}>Portal</span>
    </span>
  );
}
