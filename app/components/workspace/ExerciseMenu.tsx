"use client";

import Link from "next/link";
import { useRef } from "react";
import type { ExerciseSummary } from "@/lib/exercises-registry";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/cn";
import { Level } from "../ui/Level";

const pad = (n: number) => String(n).padStart(2, "0");

/** A modal list of every exercise. Uses <dialog> for focus trapping and Esc. */
export function ExerciseMenu({
  exercises,
  currentSlug,
}: {
  exercises: ExerciseSummary[];
  currentSlug: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const progress = useProgress();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="label flex min-h-11 items-center gap-2 border-l border-ink px-4 hover:bg-paper-2"
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">☰</span>
        <span className="hidden sm:inline">Index</span>
        <span className="sr-only sm:hidden">All exercises</span>
      </button>

      <dialog
        ref={dialog}
        aria-label="All exercises"
        onClick={(event) => {
          if (event.target === dialog.current) dialog.current?.close();
        }}
        className="m-0 mr-auto h-dvh max-h-none w-full max-w-md border-r-2 border-ink bg-paper p-0 text-ink backdrop:bg-ink/60"
      >
        <div className="flex h-full flex-col">
          <div className="flex h-14 shrink-0 items-center justify-between border-b-2 border-ink px-5">
            <h2 className="display text-2xl">Index</h2>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="label min-h-11 px-3 hover:bg-paper-2"
            >
              Close ✕
            </button>
          </div>

          <ol className="min-h-0 flex-1 overflow-y-auto">
            {exercises.map((exercise) => {
              const entry = progress[exercise.slug];
              const current = exercise.slug === currentSlug;
              return (
                <li key={exercise.slug} className="border-b border-ink">
                  <Link
                    href={`/exercises/${exercise.slug}`}
                    onClick={() => dialog.current?.close()}
                    aria-current={current ? "page" : undefined}
                    className={cn(
                      "grid min-h-14 grid-cols-[2.5rem_1fr_auto] items-center gap-3 px-5 py-3",
                      current ? "on-ink bg-ink text-paper" : "hover:bg-paper-2",
                    )}
                  >
                    <span className={cn("display tnum text-xl", current ? "text-accent" : "text-ink-3")}>
                      {pad(exercise.number)}
                    </span>
                    <span className="font-semibold leading-tight">{exercise.title}</span>
                    <span className="flex items-center gap-3">
                      <Level level={exercise.difficulty} showLabel={false} />
                      <span
                        className="label w-3 text-right"
                        aria-label={entry ? "Completed" : undefined}
                      >
                        {entry ? "■" : ""}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </div>
      </dialog>
    </>
  );
}
