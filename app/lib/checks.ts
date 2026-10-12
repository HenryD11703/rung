import { CodeAnalysis, type SyntaxIssue } from "@/lib/analysis";
import { buildProgram } from "@/lib/analysis/runtime";
import type { Check, Exercise } from "@/types";

export interface CheckResult {
  id: string;
  label: string;
  hint: string;
  kind: Check["kind"];
  /** `null` = could not be evaluated here (runtime check on the server). */
  passed: boolean | null;
}

export interface CheckReport {
  /** Syntax errors stop the run: nothing meaningful can be checked. */
  issues: SyntaxIssue[];
  results: CheckResult[];
  /** True only when every check was evaluated and passed. */
  allPassed: boolean;
}

/** Executes a program and resolves to its boolean result (e.g. in a Worker). */
export type RuntimeExecutor = (program: string) => Promise<boolean>;

export async function runChecks(
  exercise: Pick<Exercise, "checks">,
  files: Record<string, string>,
  executor?: RuntimeExecutor,
): Promise<CheckReport> {
  const analysis = CodeAnalysis.from(files);

  if (analysis.issues.length > 0) {
    return { issues: analysis.issues, results: [], allPassed: false };
  }

  const results: CheckResult[] = [];
  for (const check of exercise.checks) {
    results.push({
      id: check.id,
      label: check.label,
      hint: check.hint,
      kind: check.kind,
      passed: await evaluate(check, analysis, executor),
    });
  }

  return {
    issues: [],
    results,
    allPassed: results.every((r) => r.passed === true),
  };
}

async function evaluate(
  check: Check,
  analysis: CodeAnalysis,
  executor?: RuntimeExecutor,
): Promise<boolean | null> {
  try {
    if (check.kind === "static") return check.test(analysis) === true;

    if (!executor) return null;
    const declarations = analysis.pureDeclarations(check.file);
    if (declarations === null) return false;
    return await executor(buildProgram(declarations, check.scenario));
  } catch {
    return false;
  }
}

export const failedIds = (report: CheckReport): string[] =>
  report.results.filter((r) => r.passed === false).map((r) => r.id);
