"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSandpack } from "@codesandbox/sandpack-react";
import type { Exercise } from "@/types";
import { runChecks, type CheckReport } from "@/lib/checks";
import { runProgramInWorker } from "@/lib/analysis/runtime";
import { markPassed } from "@/lib/progress";
import { cn } from "@/lib/cn";
import { MentorPanel } from "./MentorPanel";

export interface Score {
  passed: number;
  total: number;
  ran: boolean;
}

interface Props {
  exercise: Exercise;
  next?: { slug: string; title: string };
  usedSolution: boolean;
  onScore: (score: Score) => void;
}

export function ChecksPanel({ exercise, next, usedSolution, onScore }: Props) {
  const { sandpack } = useSandpack();
  const [report, setReport] = useState<CheckReport | null>(null);
  const [ranWith, setRanWith] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const runningRef = useRef(false);

  // Only the exercise's own files count. Sandpack adds template files too.
  const files = useMemo(() => {
    const out: Record<string, string> = {};
    for (const path of Object.keys(exercise.files)) {
      out[path] = sandpack.files[path]?.code ?? exercise.files[path];
    }
    return out;
  }, [sandpack.files, exercise.files]);
  const signature = useMemo(() => JSON.stringify(files), [files]);
  const stale = report !== null && ranWith !== signature;

  const total = exercise.checks.length;

  const run = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setRunning(true);
    try {
      const next = await runChecks(exercise, files, runProgramInWorker);
      setReport(next);
      setRanWith(signature);
      if (next.allPassed) markPassed(exercise.slug, usedSolution);
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [exercise, files, signature, usedSolution]);

  // Ctrl/Cmd + Enter runs the checks, even while typing in the editor.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        void run();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [run]);

  const passed = report?.results.filter((r) => r.passed === true).length ?? 0;
  useEffect(() => {
    onScore({ passed, total, ran: report !== null });
  }, [passed, total, report, onScore]);

  const statusFor = (id: string): boolean | null =>
    report?.results.find((r) => r.id === id)?.passed ?? null;

  const hasIssues = (report?.issues.length ?? 0) > 0;
  const complete = !!report?.allPassed && !stale;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-line px-5">
        <div className="flex items-baseline gap-3">
          <h2 className="label text-muted">{report ? "Checks" : "Requirements"}</h2>
          <span className="display tnum text-2xl leading-none">
            {passed}
            <span className="text-faint">/{total}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={() => void run()}
          disabled={running}
          className="label flex min-h-9 items-center gap-2 rounded-ui bg-accent px-4 text-on-accent transition-[filter] hover:brightness-95 disabled:opacity-60"
        >
          {running ? "Running…" : "Run checks"}
          <kbd className="hidden rounded-[2px] border border-current px-1 text-[10px] opacity-70 lg:inline">Ctrl ↵</kbd>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* progress, one segment per check */}
        <div className="flex gap-1 px-5 pt-4" aria-hidden="true">
          {exercise.checks.map((check) => {
            const status = statusFor(check.id);
            return (
              <span
                key={check.id}
                className={cn(
                  "h-[5px] flex-1 rounded-[2px] transition-colors",
                  status === true && "bg-ok",
                  status === false && "bg-bad",
                  status === null && "bg-line-strong/60",
                  stale && "opacity-40",
                )}
              />
            );
          })}
        </div>

        <p className="sr-only" aria-live="polite">
          {report ? `${passed} of ${total} checks passed.` : ""}
        </p>

        {stale && (
          <p className="mx-5 mt-3 border-l-2 border-line-strong pl-3 text-sm text-muted">
            Your code changed since the last run. Run the checks again.
          </p>
        )}

        {hasIssues && (
          <div role="alert" className="mx-5 mt-4 rounded-ui border-l-4 border-bad bg-raised-2 p-3">
            <p className="label mb-2 text-bad">Syntax error</p>
            <ul className="space-y-1 font-mono text-[12px]">
              {report!.issues.map((issue, i) => (
                <li key={i}>
                  {issue.file.replace(/^\//, "")}:{issue.line} · {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {complete && (
          <div className="rise mx-5 mt-4 rounded-ui bg-accent p-4 text-on-accent">
            <p className="display text-2xl [--display-tracking:-0.012em]">
              {usedSolution ? "Matches the solution." : "All checks passed."}
            </p>
            {next ? (
              <Link
                href={`/exercises/${next.slug}`}
                className="label mt-3 inline-flex min-h-9 items-center gap-2 underline underline-offset-4"
              >
                Next: {next.title} →
              </Link>
            ) : (
              <Link href="/" className="label mt-3 inline-flex min-h-9 items-center underline underline-offset-4">
                Back to the index →
              </Link>
            )}
          </div>
        )}

        <ul className="mt-2 px-5 pb-5">
          {exercise.checks.map((check) => {
            const status = statusFor(check.id);
            return (
              <li
                key={check.id}
                data-status={status === null ? "pending" : status ? "pass" : "fail"}
                className={cn(
                  "grid grid-cols-[1.75rem_1fr] gap-x-2 border-b border-line py-3 first:border-t",
                  stale && "opacity-60",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-[18px] items-center justify-center rounded-[3px] border text-[11px] font-bold leading-none",
                    status === null && "border-line-strong",
                    status === true && "border-ok bg-ok text-on-accent",
                    status === false && "border-bad bg-bad text-on-accent",
                  )}
                >
                  {status === true ? "✓" : status === false ? "✕" : ""}
                </span>
                <div>
                  <p className="text-sm font-medium leading-snug">
                    {check.label}
                    <span className="sr-only">
                      {status === null ? " (not run yet)" : status ? " (passed)" : " (failed)"}
                    </span>
                  </p>
                  {status === false && (
                    <p className="mt-1.5 border-l-2 border-bad pl-2.5 text-sm leading-snug text-muted">
                      {check.hint}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        <MentorPanel slug={exercise.slug} files={files} report={report} stale={stale} />
      </div>
    </div>
  );
}
