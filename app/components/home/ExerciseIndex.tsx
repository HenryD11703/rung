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
            <div className="flex items-baseline justify-between border-b border-line-strong pb-3">
              <h3 id={`level-${level}`} className="display text-2xl sm:text-3xl [--display-tracking:-0.035em]">
                {LEVEL_LABEL[level]}
              </h3>
              <span className="label tnum text-muted">
                {pad(group.length)} {group.length === 1 ? "exercise" : "exercises"}
              </span>
            </div>

            <ol>
              {group.map((exercise) => {
                const entry = progress[exercise.slug];
                return (
                  <li key={exercise.slug} className="border-b border-line">
                    <Link
                      href={`/exercises/${exercise.slug}`}
                      className="group grid grid-cols-[3rem_1fr_auto] items-center gap-x-4 gap-y-1 rounded-ui px-1 py-5 transition-colors hover:bg-raised focus-visible:bg-raised sm:grid-cols-[5rem_1fr_7rem_6rem_2rem] sm:px-2"
                    >
                      <span className="display tnum text-3xl text-faint transition-colors group-hover:text-accent group-focus-visible:text-accent sm:text-[2.5rem]">
                        {pad(exercise.number)}
                      </span>

                      <span className="min-w-0">
                        <span className="block text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                          {exercise.title}
                        </span>
                        <span className="label mt-1.5 block truncate text-muted">
                          {exercise.tags.slice(0, 3).join(" · ")}
                        </span>
                      </span>

                      <span className="label tnum col-start-3 row-start-1 text-right text-muted sm:col-start-auto sm:row-start-auto sm:text-left">
                        {exercise.estimatedTime} min
                      </span>

                      <span className="col-start-2 text-muted sm:col-start-auto">
                        <Level level={exercise.difficulty} showLabel={false} />
                      </span>

                      <span
                        className={cn(
                          "col-start-3 text-right text-xl sm:col-start-auto",
                          entry ? "label text-accent" : "text-muted transition-transform group-hover:translate-x-1 group-hover:text-fg",
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
