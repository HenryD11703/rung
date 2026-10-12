import Link from "next/link";
import { cn } from "@/lib/cn";

/** Three steps climbing right: short, shorter, tallest. The top one is lime. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("size-7 shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="19" width="7" height="10" className="fill-fg" />
      <rect x="12.5" y="11" width="7" height="18" className="fill-fg" />
      <rect x="22" y="3" width="7" height="26" className="fill-accent" />
    </svg>
  );
}

export function Brand({ className, size = "md" }: { className?: string; size?: "md" | "lg" }) {
  return (
    <Link
      href="/"
      aria-label="Rung, home"
      className={cn("inline-flex items-center gap-3 rounded-ui", className)}
    >
      <BrandMark className={size === "lg" ? "size-8" : "size-[26px]"} />
      <span
        className={cn("display leading-none", "[--display-tracking:-0.03em]", size === "lg" ? "text-[1.6rem]" : "text-[1.35rem]")}
      >
        Rung
      </span>
    </Link>
  );
}
