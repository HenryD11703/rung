import { NextResponse } from "next/server";
import { CodeAnalysis } from "@/lib/analysis";
import { runChecks } from "@/lib/checks";
import { getExerciseBySlug } from "@/lib/exercises-registry";
import { cacheKey } from "@/lib/review/cache";
import { LlmUnavailableError, complete } from "@/lib/review/llm";
import { buildMessages, changedFiles } from "@/lib/review/prompt";
import { checkRateLimit, clientKey } from "@/lib/review/rate-limit";
import { reviewCache } from "@/lib/review/store";
import {
  FeedbackSchema,
  LIMITS,
  ReviewRequestSchema,
  type ReviewError,
  type ReviewResponse,
} from "@/lib/review/schema";

export const runtime = "nodejs";

function fail(
  status: number,
  error: ReviewError["error"],
  headers?: Record<string, string>,
) {
  return NextResponse.json<ReviewError>({ error }, { status, headers });
}

/** Browsers always send Origin on cross-site POSTs. Block other websites. */
function isForeignOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function POST(request: Request) {
  if (isForeignOrigin(request)) {
    return fail(403, { code: "forbidden_origin", message: "Cross-origin requests are not allowed." });
  }

  const raw = await request.text();
  if (raw.length > LIMITS.maxBodyChars) {
    return fail(413, { code: "payload_too_large", message: "That submission is too large." });
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return fail(400, { code: "invalid_json", message: "The request body is not valid JSON." });
  }

  const parsed = ReviewRequestSchema.safeParse(json);
  if (!parsed.success) {
    return fail(400, { code: "invalid_request", message: "The request does not match the expected shape." });
  }
  const { slug, files, runtimeFailed = [] } = parsed.data;

  const exercise = getExerciseBySlug(slug);
  if (!exercise) {
    return fail(404, { code: "unknown_exercise", message: "That exercise does not exist." });
  }

  const known = new Set(Object.keys(exercise.files).map((p) => p.replace(/^\/+/, "")));
  if (!Object.keys(files).every((p) => known.has(p.replace(/^\/+/, "")))) {
    return fail(400, { code: "unknown_file", message: "The submission contains files this exercise does not have." });
  }

  // Cheap, deterministic gate: it must at least parse. This also stops the
  // endpoint from being used as a general-purpose chatbot.
  const analysis = CodeAnalysis.from(files);
  if (analysis.issues.length > 0) {
    return fail(422, {
      code: "syntax_error",
      message: "Fix the syntax errors first. The mentor only reviews code that parses.",
      issues: analysis.issues.map(({ file, message, line }) => ({ file, message, line })),
    });
  }

  const changed = changedFiles(exercise, files);
  if (changed.length === 0) {
    return fail(422, { code: "no_changes", message: "Write some code first. There is nothing to review yet." });
  }

  // Re-run the static checks here. The client is never trusted for those.
  // Runtime checks run in the browser only (student code is never executed on
  // the server), so only ids that really exist are accepted from the client.
  const report = await runChecks(exercise, files);
  const runtimeIds = new Set(
    exercise.checks.filter((c) => c.kind === "runtime").map((c) => c.id),
  );
  const reportedRuntime = new Set(runtimeFailed.filter((id) => runtimeIds.has(id)));

  const failed = exercise.checks.filter((check) =>
    check.kind === "runtime"
      ? reportedRuntime.has(check.id)
      : report.results.find((r) => r.id === check.id)?.passed === false,
  );
  const passed = exercise.checks.filter((c) => !failed.includes(c));

  const key = cacheKey({ slug, failed: failed.map((c) => c.id), files: changed });
  const hit = reviewCache.get(key);
  if (hit) {
    return NextResponse.json<ReviewResponse>({
      feedback: hit,
      failed: failed.map((c) => c.id),
      cached: true,
    });
  }

  const limit = await checkRateLimit(clientKey(request));
  if (!limit.allowed) {
    return fail(
      429,
      {
        code: "rate_limited",
        message: `Too many reviews. Try again in ${limit.retryAfterSeconds} seconds.`,
        retryAfterSeconds: limit.retryAfterSeconds,
      },
      { "Retry-After": String(limit.retryAfterSeconds) },
    );
  }

  try {
    const content = await complete(
      buildMessages({
        exercise,
        failed: failed.map(({ label, hint }) => ({ label, hint })),
        passed: passed.map((c) => c.label),
        files: changed,
      }),
    );

    const feedback = FeedbackSchema.safeParse(JSON.parse(content));
    if (!feedback.success) throw new Error("The model returned an unexpected shape.");

    reviewCache.set(key, feedback.data);
    return NextResponse.json<ReviewResponse>(
      { feedback: feedback.data, failed: failed.map((c) => c.id), cached: false },
      { headers: { "X-RateLimit-Remaining": String(limit.remaining) } },
    );
  } catch (error) {
    if (error instanceof LlmUnavailableError) {
      return fail(503, { code: "unavailable", message: "The AI mentor is not available right now." });
    }
    // Never echo upstream error details to the browser.
    console.error("[review] upstream failure:", error instanceof Error ? error.name : "unknown");
    return fail(502, { code: "upstream_error", message: "The AI mentor could not review this right now. Your checks still work." });
  }
}
