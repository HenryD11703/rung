import { describe, expect, it } from "vitest";
import { exercises } from "@/lib/exercises-registry";
import { runChecks } from "@/lib/checks";
import { evaluateProgram } from "@/lib/analysis/runtime";

/** In tests the "worker" is a plain synchronous eval. Never used in the app. */
const executor = async (program: string) => evaluateProgram(program);

describe("curriculum integrity", () => {
  it("has unique slugs and unique check ids per exercise", () => {
    const slugs = exercises.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const exercise of exercises) {
      const ids = exercise.checks.map((c) => c.id);
      expect(new Set(ids).size, exercise.slug).toBe(ids.length);
    }
  });

  it("solution defines every file the starter defines", () => {
    for (const exercise of exercises) {
      expect(Object.keys(exercise.solution).sort(), exercise.slug).toEqual(
        Object.keys(exercise.files).sort(),
      );
    }
  });
});

describe.each(exercises.map((e) => [e.slug, e] as const))("%s", (_slug, exercise) => {
  it("starter code parses and fails at least one check", async () => {
    const report = await runChecks(exercise, exercise.files, executor);
    expect(report.issues, "starter has syntax errors").toEqual([]);
    expect(report.allPassed).toBe(false);
  });

  it("reference solution passes every check", async () => {
    const report = await runChecks(exercise, exercise.solution, executor);
    expect(report.issues, "solution has syntax errors").toEqual([]);
    const failed = report.results.filter((r) => r.passed !== true).map((r) => r.id);
    expect(failed).toEqual([]);
  });

  it("every check has a requirement label and a hint", () => {
    for (const check of exercise.checks) {
      expect(check.label.length).toBeGreaterThan(8);
      expect(check.hint.length).toBeGreaterThan(8);
    }
  });
});
