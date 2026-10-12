"use client";

import { useEffect, useRef, useState } from "react";
import type { CheckReport } from "@/lib/checks";
import type { Feedback, ReviewError, ReviewResponse } from "@/lib/review/schema";
import { cn } from "@/lib/cn";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "done"; feedback: Feedback }
  | { status: "error"; message: string };

interface Props {
  slug: string;
  files: Record<string, string>;
  report: CheckReport | null;
  /** The code changed since the checks last ran. */
  stale: boolean;
}

export function MentorPanel({ slug, files, report, stale }: Props) {
  const [state, setState] = useState<State>({ status: "idle" });
  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const memo = useRef(new Map<string, Feedback>());

  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, [cooldownUntil]);

  const secondsLeft = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));

  const blocker = !report
    ? "Run the checks first. They are free and instant."
    : stale
      ? "Your code changed. Run the checks again to enable the mentor."
      : report.issues.length > 0
        ? "Fix the syntax errors first. The mentor only reviews code that parses."
        : null;

  const ask = async () => {
    if (!report) return;
    const runtimeFailed = report.results
      .filter((r) => r.kind === "runtime" && r.passed === false)
      .map((r) => r.id);
    const key = JSON.stringify({ files, runtimeFailed });

    const remembered = memo.current.get(key);
    if (remembered) {
      setState({ status: "done", feedback: remembered });
      return;
    }

    setState({ status: "loading" });
    try {
      const response = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, files, runtimeFailed }),
      });
      const body = (await response.json()) as ReviewResponse | ReviewError;

      if (!response.ok || !("feedback" in body)) {
        const error = "error" in body ? body.error : undefined;
        if (error?.code === "rate_limited" && error.retryAfterSeconds) {
          setNow(Date.now());
          setCooldownUntil(Date.now() + error.retryAfterSeconds * 1000);
        }
        setState({
          status: "error",
          message: error?.message ?? "The mentor could not answer. Your checks still work.",
        });
        return;
      }

      memo.current.set(key, body.feedback);
      setState({ status: "done", feedback: body.feedback });
    } catch {
      setState({
        status: "error",
        message: "Could not reach the mentor. Check your connection. Your checks still work.",
      });
    }
  };

  const disabled = !!blocker || state.status === "loading" || secondsLeft > 0;

  return (
    <section aria-labelledby="mentor-title" className="border-t border-line-strong px-5 py-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 id="mentor-title" className="display text-xl [--display-tracking:-0.012em]">
            AI mentor
          </h3>
          <p className="mt-1 text-sm text-muted">
            Reviews only the files you changed, plus the checks you missed.
          </p>
        </div>
        <button
          type="button"
          onClick={ask}
          disabled={disabled}
          className={cn(
            "label min-h-11 shrink-0 rounded-ui border px-4 transition-colors",
            disabled
              ? "cursor-not-allowed border-line text-faint"
              : "border-accent bg-accent text-on-accent hover:brightness-95",
          )}
        >
          {state.status === "loading"
            ? "Reviewing…"
            : secondsLeft > 0
              ? `Wait ${secondsLeft}s`
              : "Ask the mentor"}
        </button>
      </div>

      {blocker && state.status === "idle" && (
        <p className="mt-3 border-l-2 border-line-strong pl-3 text-sm text-muted">{blocker}</p>
      )}

      <div aria-live="polite" aria-busy={state.status === "loading"} className="mt-4">
        {state.status === "loading" && (
          <div className="space-y-2" aria-label="Waiting for the mentor">
            {[92, 78, 64].map((w) => (
              <div key={w} className="pulse-bar h-3 rounded-[2px] bg-line-strong" style={{ width: `${w}%` }} />
            ))}
          </div>
        )}

        {state.status === "error" && (
          <p role="alert" className="rounded-ui border-l-4 border-bad bg-raised-2 p-3 text-sm">
            {state.message}
          </p>
        )}

        {state.status === "done" && <FeedbackView feedback={state.feedback} />}
      </div>
    </section>
  );
}

function FeedbackView({ feedback }: { feedback: Feedback }) {
  return (
    <div className="rise space-y-5">
      <p className="text-lg leading-snug tracking-tight">{feedback.summary}</p>
      <Bullets title="Going well" tone="ok" items={feedback.strengths} />
      <Bullets title="Worth fixing" tone="bad" items={feedback.fixes} />
      {feedback.nextStep && (
        <p className="border-t border-line pt-3 text-sm">
          <span className="label mr-2 text-muted">Next</span>
          {feedback.nextStep}
        </p>
      )}
    </div>
  );
}

function Bullets({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "ok" | "bad";
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h4 className={cn("label mb-1", tone === "ok" ? "text-ok" : "text-bad")}>{title}</h4>
      <ul>
        {items.map((item, i) => (
          <li key={i} className="grid grid-cols-[1.25rem_1fr] border-t border-line py-2 text-sm leading-snug first:border-t-0">
            <span aria-hidden="true" className={tone === "ok" ? "text-ok" : "text-bad"}>
              {tone === "ok" ? "✓" : "→"}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
