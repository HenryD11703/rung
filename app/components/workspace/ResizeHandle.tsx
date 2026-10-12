"use client";

import { useRef } from "react";
import { cn } from "@/lib/cn";

interface Props {
  /** `vertical` is a column divider (drag sideways); `horizontal` a row divider. */
  orientation: "vertical" | "horizontal";
  /** +1 when dragging right/down makes the target bigger, -1 when it makes it smaller. */
  direction: 1 | -1;
  /** Current size in "units" (pixels, or percent when `pxPerUnit` is set). */
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  onReset: () => void;
  onDragging: (dragging: boolean) => void;
  label: string;
  /** Pixels that equal one unit. Defaults to 1 (units are pixels). */
  pxPerUnit?: () => number;
  /** Keyboard step in units. Shift multiplies it by 4. */
  step?: number;
  /** Where the hit area sits inside its pane, e.g. "right-0 top-0 h-full". */
  className: string;
}

/**
 * A draggable, keyboard-operable divider. It keeps the pointer captured so the
 * drag survives crossing the preview iframe, and double-click restores the default.
 */
export function ResizeHandle({
  orientation,
  direction,
  value,
  min,
  max,
  onChange,
  onReset,
  onDragging,
  label,
  pxPerUnit = () => 1,
  step = 16,
  className,
}: Props) {
  const drag = useRef<{ pointer: number; value: number; unit: number } | null>(null);
  const vertical = orientation === "vertical";
  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  const end = () => {
    if (!drag.current) return;
    drag.current = null;
    document.body.style.cursor = "";
    onDragging(false);
  };

  return (
    <div
      role="separator"
      aria-orientation={orientation}
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = {
          pointer: vertical ? event.clientX : event.clientY,
          value,
          unit: Math.max(pxPerUnit(), 0.0001),
        };
        document.body.style.cursor = vertical ? "col-resize" : "row-resize";
        onDragging(true);
      }}
      onPointerMove={(event) => {
        const start = drag.current;
        if (!start) return;
        const pointer = vertical ? event.clientX : event.clientY;
        onChange(clamp(start.value + ((pointer - start.pointer) / start.unit) * direction));
      }}
      onPointerUp={end}
      onPointerCancel={end}
      onLostPointerCapture={end}
      onDoubleClick={onReset}
      onKeyDown={(event) => {
        const grow = vertical ? "ArrowRight" : "ArrowDown";
        const shrink = vertical ? "ArrowLeft" : "ArrowUp";
        const size = event.shiftKey ? step * 4 : step;
        if (event.key === grow) onChange(clamp(value + size * direction));
        else if (event.key === shrink) onChange(clamp(value - size * direction));
        else if (event.key === "Home") onChange(min);
        else if (event.key === "End") onChange(max);
        else if (event.key === "Enter") onReset();
        else return;
        event.preventDefault();
      }}
      className={cn(
        // Hidden below lg: phones use tabs, not splits.
        "group absolute z-20 hidden touch-none select-none outline-none lg:block",
        vertical ? "w-2.5 cursor-col-resize" : "h-2.5 cursor-row-resize",
        className,
      )}
    >
      {/* The visible line. It lights up on hover, focus and while dragging. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute bg-transparent transition-colors group-hover:bg-accent group-focus-visible:bg-accent group-active:bg-accent",
          vertical ? "inset-y-0 left-1/2 w-[2px] -translate-x-1/2" : "inset-x-0 top-1/2 h-[2px] -translate-y-1/2",
        )}
      />
    </div>
  );
}
