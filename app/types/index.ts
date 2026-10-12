import type { CodeAnalysis } from "@/lib/analysis";

export type Difficulty = "easy" | "medium" | "hard";

export interface Hint {
  question: string;
  answer: string;
}

interface CheckBase {
  /** Stable id, unique inside the exercise. */
  id: string;
  /** What is being verified, phrased as a requirement. */
  label: string;
  /** Shown when the check fails. Points the way without giving the answer. */
  hint: string;
}

/** Inspects the code's structure (AST). Instant, deterministic, free. */
export interface StaticCheck extends CheckBase {
  kind: "static";
  test: (code: CodeAnalysis) => boolean;
}

/**
 * Runs the student's pure logic against a scenario inside a Web Worker.
 * `scenario` is a function body that returns `true` when the behaviour is
 * correct. It can use any top-level, JSX-free declaration of `file`.
 */
export interface RuntimeCheck extends CheckBase {
  kind: "runtime";
  file: string;
  scenario: string;
}

export type Check = StaticCheck | RuntimeCheck;

export interface Exercise {
  slug: string;
  title: string;
  difficulty: Difficulty;

  /** One-sentence goal. */
  objective: string;
  /** Imperative steps, 5-7 max. */
  steps: string[];
  hints?: Hint[];

  theory?: {
    title: string;
    introduction?: string;
    goodPractices?: string[];
    badPractices?: string[];
    examples?: string[];
  };

  /** Starter files shown in the editor. Keys are Sandpack paths. */
  files: Record<string, string>;
  /** A passing reference solution; powers "Reveal solution" and the test suite. */
  solution: Record<string, string>;
  /** Everything that can be verified without AI. */
  checks: Check[];
  /** What the AI mentor should focus on once the checks have run. */
  mentorFocus: string;

  estimatedTime?: number;
  tags?: string[];
}
