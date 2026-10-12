"use client";

import { useProgress } from "@/lib/progress";

/** "03/12" in the corner. Renders a stable placeholder on the server. */
export function ProgressBadge({ total }: { total: number }) {
  const done = Object.keys(useProgress()).length;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <span
      className="label tnum border border-ink px-2 py-1"
      aria-label={`${done} of ${total} exercises completed`}
    >
      {pad(done)}/{pad(total)}
    </span>
  );
}
