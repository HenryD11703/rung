import Link from "next/link";
import { cn } from "@/lib/cn";

/** Three steps climbing right. Short, shorter, tallest: levels. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" fill="currentColor" />
      <rect x="5" y="19" width="5" height="8" className="fill-paper" />
      <rect x="13.5" y="12" width="5" height="15" className="fill-paper" />
      <rect x="22" y="5" width="5" height="22" className="fill-accent" />
    </svg>
  );
}

export function Brand({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Junior to Mid, home"
      className={cn("group inline-flex items-center gap-3", className)}
    >
      <BrandMark />
      <span
        className={cn(
          "display text-[1.05rem] leading-none tracking-[-0.03em]",
          compact && "hidden sm:inline",
        )}
      >
        Junior to Mid
      </span>
    </Link>
  );
}
