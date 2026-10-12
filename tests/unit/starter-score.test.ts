import { describe, expect, it } from "vitest";
import { exercises } from "@/lib/exercises-registry";
import { runChecks } from "@/lib/checks";
import { evaluateProgram } from "@/lib/analysis/runtime";

const executor = async (program: string) => evaluateProgram(program);

/**
 * A check that passes on untouched starter code is "vacuous": it rewards the
 * student for doing nothing. Guards against anti-patterns must only pass once
 * the thing they guard actually exists.
 */
describe("starter code does not pass checks by default", () => {
  it.each(exercises.map((e) => [e.slug, e] as const))("%s", async (_slug, exercise) => {
    const report = await runChecks(exercise, exercise.files, executor);
    const passing = report.results.filter((r) => r.passed).map((r) => r.id);
    expect(passing, `vacuously passing: ${passing.join(", ")}`).toEqual([]);
  });
});
