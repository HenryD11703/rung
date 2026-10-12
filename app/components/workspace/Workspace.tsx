"use client";

import Link from "next/link";
import { useCallback, useRef, useState, type CSSProperties } from "react";
import { SandpackProvider } from "@codesandbox/sandpack-react";
import { getAllExercises, getExerciseBySlug, getNeighbours } from "@/lib/exercises-registry";
import { cn } from "@/lib/cn";
import { LIMITS, useLayout } from "@/lib/workspace-layout";
import { Brand } from "../ui/Brand";
import { BriefPanel } from "./BriefPanel";
import { ChecksPanel, type Score } from "./ChecksPanel";
import { EditorPane } from "./EditorPane";
import { ExerciseMenu } from "./ExerciseMenu";
import { PreviewPane } from "./PreviewPane";
import { ResizeHandle } from "./ResizeHandle";
import { signalTheme } from "./theme";

type PaneId = "brief" | "code" | "preview" | "checks";

const PANES: { id: PaneId; label: string }[] = [
  { id: "brief", label: "Brief" },
  { id: "code", label: "Code" },
  { id: "preview", label: "Preview" },
  { id: "checks", label: "Checks" },
];

export default function Workspace({ slug }: { slug: string }) {
  const exercise = getExerciseBySlug(slug)!;
  const summaries = getAllExercises();
  const number = summaries.findIndex((s) => s.slug === slug) + 1;
  const { previous, next } = getNeighbours(slug);

  // On small screens only one pane shows at a time.
  const [pane, setPane] = useState<PaneId>("brief");
  const [usedSolution, setUsedSolution] = useState(false);
  const [score, setScore] = useState<Score>({ passed: 0, total: exercise.checks.length, ran: false });
  const onScore = useCallback((s: Score) => setScore(s), []);

  // Desktop only: drag the dividers to give the editor, preview or checks more room.
  const { layout, update, reset } = useLayout();
  const [dragging, setDragging] = useState(false);
  const rightColumn = useRef<HTMLDivElement>(null);

  const paneClass = (id: PaneId) =>
    cn(
      // overflow-hidden: Sandpack paints unwrapped code for a frame before the editor takes over.
      "absolute inset-0 min-h-0 min-w-0 overflow-hidden bg-canvas lg:relative lg:inset-auto",
      pane !== id && "invisible lg:visible",
    );

  return (
    <SandpackProvider
      template="react"
      theme={signalTheme}
      files={exercise.files}
      options={{ recompileMode: "delayed", recompileDelay: 600, initMode: "user-visible" }}
    >
      <div className="flex h-dvh flex-col bg-canvas" data-dragging={dragging || undefined}>
        {/* ---------------------------------------------------------- header */}
        <header className="flex h-12 shrink-0 items-stretch justify-between border-b border-line pl-4 lg:h-[52px]">
          <div className="flex min-w-0 items-center gap-4">
            <Brand />
            <span className="hidden h-5 w-px bg-line-strong sm:block" aria-hidden="true" />
            <p className="min-w-0 truncate">
              <span className="label tnum mr-2 text-muted">
                {String(number).padStart(2, "0")}/{String(summaries.length).padStart(2, "0")}
              </span>
              <span className="hidden text-sm font-semibold sm:inline">{exercise.title}</span>
            </p>
          </div>

          <nav aria-label="Exercise navigation" className="flex items-stretch">
            <NavLink href={previous ? `/exercises/${previous.slug}` : undefined} label="Previous exercise">
              ←
            </NavLink>
            <NavLink href={next ? `/exercises/${next.slug}` : undefined} label="Next exercise">
              →
            </NavLink>
            <ExerciseMenu exercises={summaries} currentSlug={slug} />
          </nav>
        </header>

        {/* ------------------------------------------------------------ body */}
        <main
          id="main"
          style={{ "--brief-w": `${layout.brief}px`, "--right-w": `${layout.right}px` } as CSSProperties}
          className="relative min-h-0 flex-1 lg:grid lg:grid-cols-[minmax(240px,var(--brief-w))_minmax(320px,1fr)_minmax(300px,var(--right-w))]"
        >
          <section aria-label="Brief" className={cn(paneClass("brief"), "lg:border-r lg:border-line")}>
            <BriefPanel exercise={exercise} number={number} />
          </section>

          <section aria-label="Code editor" className={paneClass("code")}>
            <EditorPane exercise={exercise} onReveal={() => setUsedSolution(true)} />
            <ResizeHandle
              orientation="vertical"
              direction={1}
              label="Resize the brief panel"
              value={layout.brief}
              min={LIMITS.brief.min}
              max={LIMITS.brief.max}
              onChange={(brief) => update({ brief })}
              onReset={() => reset("brief")}
              onDragging={setDragging}
              className="left-0 top-0 h-full"
            />
          </section>

          <div
            ref={rightColumn}
            className="contents lg:relative lg:flex lg:min-h-0 lg:flex-col lg:border-l lg:border-line"
          >
            <ResizeHandle
              orientation="vertical"
              direction={-1}
              label="Resize the preview and checks column"
              value={layout.right}
              min={LIMITS.right.min}
              max={LIMITS.right.max}
              onChange={(right) => update({ right })}
              onReset={() => reset("right")}
              onDragging={setDragging}
              className="-left-px top-0 h-full"
            />
            <section aria-label="Preview" className={cn(paneClass("preview"), "lg:min-h-0 lg:flex-1")}>
              <PreviewPane />
            </section>
            <section
              aria-label="Checks"
              style={{ "--checks-h": `${layout.checks}%` } as CSSProperties}
              className={cn(
                paneClass("checks"),
                "lg:h-[var(--checks-h)] lg:max-h-[calc(100%-140px)] lg:min-h-[140px] lg:flex-none lg:border-t lg:border-line-strong",
              )}
            >
              <ResizeHandle
                orientation="horizontal"
                direction={-1}
                label="Resize the preview and checks split"
                value={layout.checks}
                min={LIMITS.checks.min}
                max={LIMITS.checks.max}
                step={2}
                pxPerUnit={() => (rightColumn.current?.clientHeight ?? 100) / 100}
                onChange={(checks) => update({ checks })}
                onReset={() => reset("checks")}
                onDragging={setDragging}
                className="inset-x-0 -top-px"
              />
              <ChecksPanel
                exercise={exercise}
                next={next ? { slug: next.slug, title: next.title } : undefined}
                usedSolution={usedSolution}
                onScore={onScore}
              />
            </section>
          </div>
        </main>

        {/* --------------------------------------------- mobile tab bar */}
        <nav
          aria-label="Workspace sections"
          className="grid shrink-0 grid-cols-4 border-t border-line-strong bg-canvas pb-[env(safe-area-inset-bottom)] lg:hidden"
        >
          {PANES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPane(p.id)}
              aria-pressed={pane === p.id}
              className={cn(
                "label flex min-h-14 flex-col items-center justify-center gap-0.5 border-r border-line last:border-r-0",
                pane === p.id
                  ? "bg-raised-2 text-accent shadow-[inset_0_2px_0_var(--accent)]"
                  : "text-muted",
              )}
            >
              {p.label}
              {p.id === "checks" && (
                <span className="tnum text-[10px] opacity-80">
                  {score.passed}/{score.total}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>
    </SandpackProvider>
  );
}

function NavLink({
  href,
  label,
  children,
}: {
  href?: string;
  label: string;
  children: React.ReactNode;
}) {
  const base = "label flex min-h-11 w-12 items-center justify-center border-l border-line text-base";
  return href ? (
    <Link href={href} aria-label={label} className={cn(base, "text-muted transition-colors hover:text-fg")}>
      {children}
    </Link>
  ) : (
    <span aria-label={`${label} (none)`} className={cn(base, "text-faint")}>
      {children}
    </span>
  );
}
