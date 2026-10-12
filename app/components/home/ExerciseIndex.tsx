"use client";

import Link from "next/link";
import type { ExerciseSummary } from "@/lib/exercises-registry";
import { useProgress } from "@/lib/progress";
import { cn } from "@/lib/cn";
import type { Difficulty } from "@/types";
import { LEVEL_LABEL, Level } from "../ui/Level";

const ORDER: Difficulty[] = ["easy", "medium", "hard"];
const pad = (n: number) => String(n).padStart(2, "0");

export function ExerciseIndex({ exercises }: { exercises: ExerciseSummary[] }) {
  const progress = useProgress();

  return (
    <div>
      {ORDER.map((level) => {
        const group = exercises.filter((e) => e.difficulty === level);
        if (group.length === 0) return null;
        return (
          <section key={level} aria-labelledby={`level-${level}`} className="mb-12 last:mb-0">
            <div className="flex items-baseline justify-between border-b-2 border-ink pb-2">
              <h3 id={`level-${level}`} className="display text-2xl sm:text-3xl">
                {LEVEL_LABEL[level]}
              </h3>
              <span className="label tnum text-ink-2">
                {pad(group.length)} {group.length === 1 ? "exercise" : "exercises"}
              </span>
            </div>

            <ol>
              {group.map((exercise) => {
                const entry = progress[exercise.slug];
                return (
                  <li key={exercise.slug} className="border-b border-ink">
                    <Link
                      href={`/exercises/${exercise.slug}`}
                      className="group grid grid-cols-[3rem_1fr_auto] items-baseline gap-x-4 gap-y-1 px-1 py-4 transition-colors hover:bg-ink hover:text-paper focus-visible:bg-ink focus-visible:text-paper sm:grid-cols-[5rem_1fr_7rem_6rem_2rem] sm:px-2 sm:py-5"
                    >
                      <span className="display tnum text-3xl text-ink-3 group-hover:text-accent group-focus-visible:text-accent sm:text-4xl">
                        {pad(exercise.number)}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                          {exercise.title}
                        </span>
                        <span className="label mt-1 block truncate text-ink-3 group-hover:text-paper/70 group-focus-visible:text-paper/70">
                          {exercise.tags.slice(0, 3).join(" · ")}
                        </span>
                      </span>

                      <span className="label tnum col-start-3 row-start-1 text-right sm:col-start-auto sm:row-start-auto sm:text-left">
                        {exercise.estimatedTime} min
                      </span>

                      <span className="col-start-2 sm:col-start-auto">
                        <Level level={exercise.difficulty} showLabel={false} />
                      </span>

                      <span
                        className={cn(
                          "col-start-3 text-right text-xl sm:col-start-auto",
                          entry ? "label" : "transition-transform group-hover:translate-x-1",
                        )}
                        aria-label={
                          entry
                            ? entry.usedSolution
                              ? "Completed with the solution revealed"
                              : "Completed"
                            : undefined
                        }
                      >
                        {entry ? (entry.usedSolution ? "◐" : "■") : "→"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}
