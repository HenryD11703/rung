"use client";

import { useSyncExternalStore } from "react";

const KEY = "j2m:progress:v1";

export interface ProgressEntry {
  passedAt: number;
  /** True when the solution was revealed before the checks passed. */
  usedSolution: boolean;
}

export type Progress = Record<string, ProgressEntry>;

const EMPTY: Progress = {};
const listeners = new Set<() => void>();

let rawCache: string | null = null;
let valueCache: Progress = EMPTY;

function read(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY) ?? "";
    if (raw === rawCache) return valueCache;
    rawCache = raw;
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    valueCache =
      parsed && typeof parsed === "object" && !Array.isArray(parsed)
        ? (parsed as Progress)
        : EMPTY;
  } catch {
    // Storage can be blocked (private mode). Progress is a nicety, not a need.
    valueCache = EMPTY;
  }
  return valueCache;
}

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function markPassed(slug: string, usedSolution: boolean) {
  const current = read();
  const previous = current[slug];
  // Never downgrade an honest pass to a "peeked" one.
  if (previous && !previous.usedSolution) return;

  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ ...current, [slug]: { passedAt: Date.now(), usedSolution } }),
    );
  } catch {
    return;
  }
  emit();
}

export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
