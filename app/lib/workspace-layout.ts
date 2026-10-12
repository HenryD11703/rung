"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Desktop workspace layout. Widths are pixels; `checks` is the percentage of
 * the right column that the checks panel takes (the rest is the preview).
 */
export interface Layout {
  brief: number;
  right: number;
  checks: number;
}

export const DEFAULT_LAYOUT: Layout = { brief: 360, right: 420, checks: 56 };

export const LIMITS = {
  brief: { min: 260, max: 560 },
  right: { min: 300, max: 760 },
  checks: { min: 20, max: 80 },
} as const;

const KEY = "rung:layout:v1";

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/** Ignore anything that is not a sane number: storage can hold stale or edited data. */
function sanitize(raw: unknown): Layout {
  const source = (raw && typeof raw === "object" ? raw : {}) as Partial<Record<keyof Layout, unknown>>;
  const pick = (key: keyof Layout) => {
    const value = source[key];
    return typeof value === "number" && Number.isFinite(value)
      ? clamp(value, LIMITS[key].min, LIMITS[key].max)
      : DEFAULT_LAYOUT[key];
  };
  return { brief: pick("brief"), right: pick("right"), checks: pick("checks") };
}

/** The resizable layout, remembered in this browser. */
export function useLayout() {
  const [layout, setLayout] = useState<Layout>(DEFAULT_LAYOUT);

  // Read after mount so the server and first client render agree.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from storage
      if (saved) setLayout(sanitize(JSON.parse(saved)));
    } catch {
      // Storage can be blocked or corrupted. The defaults are fine.
    }
  }, []);

  const update = useCallback((patch: Partial<Layout>) => {
    setLayout((current) => {
      const next = sanitize({ ...current, ...patch });
      try {
        window.localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Not being able to remember the layout is not worth an error.
      }
      return next;
    });
  }, []);

  const reset = useCallback((key: keyof Layout) => update({ [key]: DEFAULT_LAYOUT[key] }), [update]);

  return { layout, update, reset };
}
