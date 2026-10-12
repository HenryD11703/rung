import type { Difficulty } from "@/types";
import { cn } from "@/lib/cn";

const RANK: Record<Difficulty, number> = { easy: 1, medium: 2, hard: 3 };
export const LEVEL_LABEL: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

/** Three squares, filled left to right. */
export function Level({
  level,
  showLabel = true,
  className,
}: {
  level: Difficulty;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-2", className)}
      role="img"
      aria-label={`Difficulty: ${LEVEL_LABEL[level]}`}
    >
      <span className="flex gap-[3px]" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn("block size-[9px] rounded-[2px] border border-current", i <= RANK[level] && "bg-current")}
          />
        ))}
      </span>
      {showLabel && <span className="label">{LEVEL_LABEL[level]}</span>}
    </span>
  );
}
