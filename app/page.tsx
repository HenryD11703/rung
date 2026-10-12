import Link from "next/link";
import { exercises, getAllExercises } from "@/lib/exercises-registry";
import { cn } from "@/lib/cn";
import type { Difficulty } from "@/types";
import { ExerciseIndex } from "@/components/home/ExerciseIndex";
import { BrandMark } from "@/components/ui/Brand";
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
  const totalHours = Math.round(
    summaries.reduce((sum, e) => sum + e.estimatedTime, 0) / 60,
  );
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
        <section className="border-b-2 border-ink">
          <div className="mx-auto grid max-w-[1400px] gap-10 px-5 pb-12 pt-10 md:px-8 lg:grid-cols-12 lg:pb-16 lg:pt-14">
            <div className="lg:col-span-8">
              <p className="label mb-6 flex items-center gap-3 text-ink-2">
                <BrandMark className="size-4" />
                React practice · 2026 edition
              </p>

              <h1 className="display text-[clamp(4rem,15.5vw,13.5rem)] leading-[0.8]">
                Junior
                <br />
                to Mid<span className="text-accent">.</span>
              </h1>

              <div className="mt-10 grid gap-8 md:grid-cols-[1fr_auto] md:items-end lg:max-w-3xl">
                <p className="max-w-[34rem] text-xl leading-snug tracking-tight sm:text-2xl">
                  Twelve hands-on React exercises. Write the code, run checks that
                  say exactly what is missing, then ask a mentor to review what you
                  changed.
                </p>
                <Link
                  href={`/exercises/${summaries[0].slug}`}
                  className="on-ink group inline-flex h-14 items-center justify-between gap-6 bg-ink px-6 text-paper transition-colors hover:bg-accent hover:text-ink focus-visible:bg-accent focus-visible:text-ink"
                >
                  <span className="font-semibold">Start with 01</span>
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </Link>
              </div>
            </div>

            {/* The brand mark, drawn from real data: bar height = difficulty. */}
            <figure className="lg:col-span-4 lg:self-end">
              <div
                className="flex h-56 items-end gap-3 sm:h-72 lg:h-[26rem]"
                role="img"
                aria-label={`Exercises per level: ${perLevel
                  .map((l) => `${l.items.length} ${LEVEL_LABEL[l.level].toLowerCase()}`)
                  .join(", ")}`}
              >
                {perLevel.map(({ level, items }, i) => (
                  <div
                    key={level}
                    className={cn(
                      "flex flex-1 flex-col justify-between p-3",
                      i === 2 ? "bg-accent text-ink" : "bg-ink text-paper",
                    )}
                    style={{ height: `${(i + 1) * 33.33}%` }}
                  >
                    <span className="label">{LEVEL_LABEL[level]}</span>
                    <span className="display tnum text-5xl leading-none sm:text-6xl">
                      {String(items.length).padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
              <figcaption className="label mt-3 text-ink-2">
                Fig. 1 · Exercises per level
              </figcaption>
            </figure>
          </div>

          {/* stat strip */}
          <dl className="mx-auto grid max-w-[1400px] grid-cols-2 border-t-2 border-ink md:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={cn(
                  "px-5 py-5 md:px-8",
                  i % 2 === 1 && "border-l border-ink",
                  i >= 2 && "border-t border-ink md:border-t-0",
                  i > 0 && "md:border-l md:border-ink",
                )}
              >
                <dt className="label text-ink-2">{stat.label}</dt>
                <dd className="display tnum mt-1 text-4xl sm:text-5xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ------------------------------------------------------ how it works */}
        <section aria-labelledby="how" className="border-b-2 border-ink">
          <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 lg:py-20">
            <div className="grid gap-10 lg:grid-cols-12">
              <h2 id="how" className="display text-4xl sm:text-5xl lg:col-span-4">
                How a session works
              </h2>
              <ol className="grid gap-px bg-ink sm:grid-cols-2 lg:col-span-8">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="bg-paper p-5 sm:p-6">
                    <span className="display tnum text-5xl text-accent-deep">{i + 1}</span>
                    <h3 className="mt-3 text-xl font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-2 max-w-sm text-ink-2">{step.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ index */}
        <section id="exercises" aria-labelledby="index" className="scroll-mt-4">
          <div className="mx-auto max-w-[1400px] px-5 py-14 md:px-8 lg:py-20">
            <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
              <h2 id="index" className="display text-5xl sm:text-7xl">
                Index
              </h2>
              <p className="label max-w-xs text-right text-ink-2">
                Progress is saved in this browser only
              </p>
            </div>
            <ExerciseIndex exercises={summaries} />
          </div>
        </section>
      </main>

      <footer className="border-t-2 border-ink">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-8 md:px-8">
          <p className="label text-ink-2">
            Built by Henry Quel · Next.js, Sandpack, Groq
          </p>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="label underline underline-offset-4"
          >
            Source code and contributing ↗
          </a>
        </div>
      </footer>
    </>
  );
}
