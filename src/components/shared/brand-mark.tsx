import Image from "next/image";
import { cn } from "@/lib/utils";
import { BRAND_WORDMARK } from "@/lib/brand";

const ICON_SIZES = {
  sm: 44,
  md: 56,
  lg: 80,
} as const;

type BrandMarkProps = {
  variant?: "icon" | "wordmark";
  size?: keyof typeof ICON_SIZES;
  className?: string;
  wordmarkClassName?: string;
};

export function BrandMark({
  variant = "icon",
  size = "sm",
  className,
  wordmarkClassName,
}: BrandMarkProps) {
  const px = ICON_SIZES[size];

  if (variant === "wordmark") {
    return (
      <span
        className={cn(
          "font-[family-name:var(--font-display)] font-semibold tracking-tight",
          wordmarkClassName
        )}
      >
        {BRAND_WORDMARK.primary}{" "}
        <span className="text-primary">{BRAND_WORDMARK.accent}</span>
      </span>
    );
  }

  return (
    <Image
      src="/favicon.svg"
      alt=""
      width={px}
      height={px}
      className={cn("shrink-0 rounded-2xl", className)}
      priority
    />
  );
}
