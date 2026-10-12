import { createHash } from "node:crypto";

interface Entry<T> {
  value: T;
  expiresAt: number;
}

/** Tiny in-memory LRU with a TTL. Identical submissions never hit the LLM twice. */
export class TtlCache<T> {
  private entries = new Map<string, Entry<T>>();

  constructor(
    private readonly maxEntries = 200,
    private readonly ttlMs = 10 * 60 * 1000,
  ) {}

  get(key: string, now = Date.now()): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= now) {
      this.entries.delete(key);
      return undefined;
    }
    // refresh recency
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, now = Date.now()) {
    this.entries.delete(key);
    this.entries.set(key, { value, expiresAt: now + this.ttlMs });
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }

  clear() {
    this.entries.clear();
  }
}

export const cacheKey = (parts: unknown): string =>
  createHash("sha256").update(JSON.stringify(parts)).digest("hex");
