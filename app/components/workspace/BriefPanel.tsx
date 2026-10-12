"use client";

import { useId, useState } from "react";
import type { Exercise } from "@/types";
import { cn } from "@/lib/cn";
import { Level } from "../ui/Level";
import { Markdown } from "../ui/Markdown";

type Tab = "brief" | "theory" | "hints";

export function BriefPanel({ exercise, number }: { exercise: Exercise; number: number }) {
  const hasTheory = !!exercise.theory;
  const hints = exercise.hints ?? [];
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "brief", label: "Brief" },
    ...(hasTheory ? [{ id: "theory" as const, label: "Theory" }] : []),
    ...(hints.length ? [{ id: "hints" as const, label: "Hints", count: hints.length }] : []),
  ];
  const [tab, setTab] = useState<Tab>("brief");
  const baseId = useId();

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="shrink-0 px-5 pb-4 pt-5">
        <div className="label flex items-center gap-4 text-muted">
          <span className="tnum">No. {String(number).padStart(2, "0")}</span>
          <Level level={exercise.difficulty} />
          {exercise.estimatedTime ? <span className="tnum">{exercise.estimatedTime} min</span> : null}
        </div>
        <h1 className="display mt-3 text-[1.9rem] leading-[1.02] [--display-tracking:-0.012em]">{exercise.title}</h1>
      </header>

      <div role="tablist" aria-label="Exercise sections" className="flex shrink-0 border-y border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`${baseId}-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`${baseId}-panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "label min-h-11 flex-1 px-3 transition-colors",
              tab === t.id
                ? "text-fg shadow-[inset_0_-2px_0_var(--accent)]"
                : "text-muted hover:text-fg",
            )}
          >
            {t.label}
            {t.count ? <span className="tnum ml-1.5 opacity-70">{t.count}</span> : null}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`${baseId}-panel-${tab}`}
        aria-labelledby={`${baseId}-tab-${tab}`}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-5 py-6"
      >
        {tab === "brief" && (
          <div className="rise space-y-8">
            <section>
              <h2 className="label mb-3 text-muted">Mission</h2>
              <p className="text-[1.1rem] leading-snug tracking-tight">{exercise.objective}</p>
            </section>

            <section>
              <h2 className="label mb-3 text-muted">Tasks</h2>
              <ol>
                {exercise.steps.map((step, i) => (
                  <li key={i} className="grid grid-cols-[2rem_1fr] gap-3 border-t border-line py-3">
                    <span className="display tnum text-xl leading-6 text-accent">{i + 1}</span>
                    <span className="text-[0.92rem] leading-snug text-fg/90">
                      <Markdown content={step} />
                    </span>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}

        {tab === "theory" && exercise.theory && (
          <div className="rise space-y-8">
            <section>
              <h2 className="display text-2xl leading-tight [--display-tracking:-0.012em]">{exercise.theory.title}</h2>
              {exercise.theory.introduction && (
                <div className="mt-3 leading-relaxed text-muted">
                  <Markdown content={exercise.theory.introduction} />
                </div>
              )}
            </section>

            <PracticeList title="Do" mark="✓" tone="ok" items={exercise.theory.goodPractices} />
            <PracticeList title="Avoid" mark="✕" tone="bad" items={exercise.theory.badPractices} />

            {exercise.theory.examples && exercise.theory.examples.length > 0 && (
              <section>
                <h3 className="label mb-3 text-muted">Examples</h3>
                <div className="space-y-3">
                  {exercise.theory.examples.map((example, i) => (
                    <pre
                      key={i}
                      className="overflow-x-auto rounded-ui border border-line bg-raised-2 p-3 font-mono text-[12px] leading-5"
                    >
                      {example}
                    </pre>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

        {tab === "hints" && (
          <div className="rise space-y-3">
            <p className="label mb-4 text-muted">Try first. Open a hint only when stuck.</p>
            {hints.map((hint, i) => (
              <details key={i} className="group rounded-ui border border-line">
                <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 font-semibold leading-tight marker:hidden hover:bg-raised [&::-webkit-details-marker]:hidden">
                  <span>{hint.question}</span>
                  <span aria-hidden="true" className="label shrink-0 text-accent group-open:hidden">
                    +
                  </span>
                  <span aria-hidden="true" className="label hidden shrink-0 text-accent group-open:inline">
                    −
                  </span>
                </summary>
                <div className="whitespace-pre-wrap border-t border-line bg-raised p-3 font-mono text-[12px] leading-5 text-fg/90">
                  {hint.answer}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PracticeList({
  title,
  mark,
  tone,
  items,
}: {
  title: string;
  mark: string;
  tone: "ok" | "bad";
  items?: string[];
}) {
  if (!items?.length) return null;
  return (
    <section>
      <h3
        className={cn(
          "label mb-1 border-b pb-2",
          tone === "ok" ? "border-ok/50 text-ok" : "border-bad/50 text-bad",
        )}
      >
        {title}
      </h3>
      <ul>
        {items.map((item, i) => (
          <li key={i} className="grid grid-cols-[1.5rem_1fr] gap-2 border-b border-line py-3 text-sm leading-snug text-fg/90">
            <span aria-hidden="true" className={cn("font-bold", tone === "ok" ? "text-ok" : "text-bad")}>
              {mark}
            </span>
            <Markdown content={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
