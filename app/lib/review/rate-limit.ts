import { createHash } from "node:crypto";

export interface RateLimitRule {
  /** Short label used as part of the storage key. */
  name: string;
  limit: number;
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

const envInt = (name: string, fallback: number) => {
  const parsed = Number.parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const rules = (): RateLimitRule[] => [
  { name: "minute", limit: envInt("REVIEW_LIMIT_PER_MINUTE", 5), windowSeconds: 60 },
  { name: "day", limit: envInt("REVIEW_LIMIT_PER_DAY", 60), windowSeconds: 86_400 },
];

/** Storage keys never contain the raw IP address. */
export const clientKey = (request: Request): string => {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  return createHash("sha256").update(ip).digest("hex").slice(0, 24);
};

// ---------------------------------------------------------------------------
// In-memory fixed window. Good enough for one process (dev, a single server).
// On serverless each instance has its own memory, so configure Upstash below
// when you need a limit that holds across instances.
// ---------------------------------------------------------------------------
interface Window {
  count: number;
  resetAt: number;
}

const memory = new Map<string, Window>();
const MAX_ENTRIES = 5_000;

function hitMemory(key: string, rule: RateLimitRule, now: number): RateLimitResult {
  if (memory.size > MAX_ENTRIES) {
    for (const [k, w] of memory) if (w.resetAt <= now) memory.delete(k);
    if (memory.size > MAX_ENTRIES) memory.clear();
  }

  let window = memory.get(key);
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + rule.windowSeconds * 1000 };
    memory.set(key, window);
  }
  window.count += 1;

  return {
    allowed: window.count <= rule.limit,
    remaining: Math.max(0, rule.limit - window.count),
    retryAfterSeconds: Math.max(1, Math.ceil((window.resetAt - now) / 1000)),
  };
}

// ---------------------------------------------------------------------------
// Optional shared store through Upstash Redis' REST API (no extra dependency).
// Enabled when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
// ---------------------------------------------------------------------------
async function hitUpstash(
  key: string,
  rule: RateLimitRule,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const response = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, rule.windowSeconds, "NX"],
        ["TTL", key],
      ]),
      signal: AbortSignal.timeout(1_500),
    });
    if (!response.ok) return null;

    const [incr, , ttl] = (await response.json()) as { result: number }[];
    if (typeof incr?.result !== "number") return null;

    return {
      allowed: incr.result <= rule.limit,
      remaining: Math.max(0, rule.limit - incr.result),
      retryAfterSeconds: Math.max(1, ttl?.result ?? rule.windowSeconds),
    };
  } catch {
    return null; // fall back to memory instead of failing open or closed
  }
}

/** Checks every rule. The first one that denies wins. */
export async function checkRateLimit(
  identity: string,
  ruleSet: RateLimitRule[] = rules(),
  now = Date.now(),
): Promise<RateLimitResult> {
  let tightest: RateLimitResult = {
    allowed: true,
    remaining: Number.POSITIVE_INFINITY,
    retryAfterSeconds: 0,
  };

  for (const rule of ruleSet) {
    const key = `review:${rule.name}:${identity}`;
    const result = (await hitUpstash(key, rule)) ?? hitMemory(key, rule, now);
    if (!result.allowed) return result;
    if (result.remaining < tightest.remaining) tightest = result;
  }
  return tightest;
}

/** Test helper. */
export const resetRateLimits = () => memory.clear();
