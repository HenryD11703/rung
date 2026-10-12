import Link from "next/link";
import { exercises, getAllExercises } from "@/lib/exercises-registry";
import { cn } from "@/lib/cn";
import type { Difficulty } from "@/types";
import { ExerciseIndex } from "@/components/home/ExerciseIndex";
import { Brand } from "@/components/ui/Brand";
import { REPO_URL, SiteHeader } from "@/components/ui/SiteHeader";
import { LEVEL_LABEL } from "@/components/ui/Level";

const LEVELS: Difficulty[] = ["easy", "medium", "hard"];

const STEPS = [
  {
    title: "Read the brief",
    body: "A clear mission, concrete tasks and the theory behind them. Hints stay folded until you ask.",
  },
  {
    title: "Write the code",
    body: "Edit real React in a live sandbox. The preview and the console update as you type.",
  },
  {
    title: "Run the checks",
    body: "Every requirement is verified in your browser, instantly. Each failure tells you where to look.",
  },
  {
    title: "Ask the mentor",
    body: "For a second opinion, an AI reviews only the files you changed and the checks you missed.",
  },
];

export default function Home() {
  const summaries = getAllExercises();
  const totalChecks = exercises.reduce((sum, e) => sum + e.checks.length, 0);
  const totalHours = Math.round(summaries.reduce((sum, e) => sum + e.estimatedTime, 0) / 60);
  const perLevel = LEVELS.map((level) => ({
    level,
    items: summaries.filter((e) => e.difficulty === level),
  }));

  const stats = [
    { value: String(summaries.length), label: "Exercises" },
    { value: String(totalChecks), label: "Automated checks" },
    { value: `~${totalHours}h`, label: "Total practice" },
    { value: "Free", label: "Open source" },
  ];

  return (
    <>
      <SiteHeader total={summaries.length} />

      <main id="main">
        {/* ------------------------------------------------------------ hero */}
        <section className="grid-lines border-b border-line">
          <div className="mx-auto grid max-w-[1360px] gap-12 px-5 pb-14 pt-12 md:px-10 lg:grid-cols-[1.25fr_1fr] lg:items-end lg:gap-12 lg:pb-20 lg:pt-20">
            <div>
              <p className="label mb-7 flex items-center gap-3 text-muted">
                <span className="size-2 rounded-[2px] bg-accent" aria-hidden="true" />
                React practice, with feedback
              </p>

              <h1 className="display pb-[0.1em] text-[clamp(5.5rem,17vw,15.5rem)] leading-[0.82]">
                Rung<span className="text-accent">.</span>
              </h1>

              <p className="mt-9 max-w-[34rem] text-xl leading-snug tracking-tight sm:text-[1.35rem]">
                Climb from junior to mid, one rung at a time. Write real React, pass
                automated checks, then ask a mentor to review{" "}
                <strong className="font-semibold">only what you changed</strong>.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <Link
                  href={`/exercises/${summaries[0].slug}`}
                  className="group inline-flex h-[52px] w-full items-center justify-center gap-3 rounded-ui bg-accent px-6 sm:w-auto font-semibold text-on-accent transition-[filter] hover:brightness-95"
                >
                  Start with exercise 01
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
                <a
                  href="#exercises"
                  className="inline-flex h-[52px] w-full items-center justify-center rounded-ui border border-line-strong px-6 sm:w-auto font-semibold transition-colors hover:bg-raised-2"
                >
                  Browse the index
                </a>
              </div>
            </div>

            {/* The brand mark, drawn from real data: bar height = difficulty. */}
            <figure>
              <div
                className="flex h-60 items-end gap-3 sm:h-80 lg:h-[27rem]"
                role="img"
                aria-label={`Exercises per level: ${perLevel
                  .map((l) => `${l.items.length} ${LEVEL_LABEL[l.level].toLowerCase()}`)
                  .join(", ")}`}
              >
                {perLevel.map(({ level, items }, i) => (
                  <div
                    key={level}
                    className={cn(
                      "flex flex-1 flex-col justify-between rounded-ui border p-4",
                      i === 2
                        ? "border-accent bg-accent text-on-accent"
                        : "border-line bg-raised-2 text-fg",
                    )}
                    style={{ height: `${(i + 1) * 33.33}%` }}
                  >
                    <span className="label opacity-80">{LEVEL_LABEL[level]}</span>
                    <span className="display tnum text-5xl leading-none sm:text-6xl lg:text-[4.75rem]">
                      {String(items.length).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
              <figcaption className="label mt-3 text-muted">Fig. 1 · Exercises per level</figcaption>
            </figure>
          </div>

          {/* stat strip */}
          <div className="mx-auto max-w-[1360px] px-5 md:px-10">
            <dl className="grid grid-cols-2 border-t border-line-strong md:grid-cols-4">
              {stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className={cn(
                    "py-6",
                    i % 2 === 1 && "border-l border-line pl-6 md:pl-6",
                    i >= 2 && "border-t border-line md:border-t-0",
                    i > 0 && "md:border-l md:border-line md:pl-6",
                  )}
                >
                  <dt className="label text-muted">{stat.label}</dt>
                  <dd className="display tnum mt-2 text-4xl sm:text-5xl">{stat.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* ------------------------------------------------------ how it works */}
        <section id="how" aria-labelledby="how-title" className="scroll-mt-4 border-b border-line">
          <div className="mx-auto max-w-[1360px] px-5 py-16 md:px-10 lg:py-24">
            <div className="grid gap-10 lg:grid-cols-12">
              <h2 id="how-title" className="display text-4xl sm:text-6xl lg:col-span-4">
                How a session works
              </h2>
              <ol className="grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-8">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="border-t border-line-strong pt-4">
                    <span className="display tnum text-5xl text-accent">{i + 1}</span>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-sm text-muted">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ index */}
        <section id="exercises" aria-labelledby="index" className="scroll-mt-4">
          <div className="mx-auto max-w-[1360px] px-5 py-16 md:px-10 lg:py-24">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 id="index" className="display text-5xl sm:text-7xl">
                Index
              </h2>
              <p className="label max-w-xs text-right text-muted">Progress is saved in this browser only</p>
            </div>
            <ExerciseIndex exercises={summaries} />
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-10">
          <div className="flex items-center gap-5">
            <Brand />
            <p className="label hidden text-muted sm:block">Built by Henry Quel · Next.js, Sandpack, Groq</p>
          </div>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="label text-muted underline underline-offset-4 transition-colors hover:text-fg"
          >
            Source code and contributing ↗
          </a>
        </div>
      </footer>
    </>
  );
}
