import type { Exercise } from "@/types";
import { staticCheck } from "../predicates";

/**
 * Copy this file, rename it, fill it in and register it in
 * `app/lib/exercises-registry.ts`. Read CONTRIBUTING.md first.
 *
 * Rule of thumb: everything that can be verified from the code's structure
 * belongs in `checks`. The AI mentor only explains; it never decides pass/fail.
 */
export const templateExercise: Exercise = {
  slug: "your-exercise-slug", // kebab-case, unique, becomes /exercises/<slug>
  title: "Concept: What the Student Builds",
  difficulty: "easy", // "easy" | "medium" | "hard"

  // One sentence. Start with a verb.
  objective: "Use X so that Y.",

  // 4-6 imperative steps. Each one should map to at least one check.
  steps: [
    "Do the first concrete thing.",
    "Do the next concrete thing.",
    "Finish with something the student can see working.",
  ],

  hints: [
    {
      question: "A question a stuck student would really ask?",
      answer: "A short answer with a minimal snippet. Never the full solution.",
    },
  ],

  theory: {
    title: "The concept in one line",
    introduction: "Why it matters, before how it works. Markdown is supported.",
    goodPractices: ["Practice to follow, with the reason."],
    badPractices: ["Anti-pattern to avoid, with what breaks."],
    examples: ["// A short, runnable snippet\nconst [value, setValue] = useState(0);"],
  },

  // What the student starts with. Keys are Sandpack paths (leading slash).
  // Starter code must FAIL every check: do not pre-solve anything.
  files: {
    "/App.js": `import React from 'react';

export default function App() {
  // 1. Your code here
  return <h1>Hello</h1>;
}`,
  },

  // A passing solution with exactly the same files as the starter.
  solution: {
    "/App.js": `import { useState } from 'react';

export default function App() {
  const [value] = useState(0);
  return <h1>Hello {value}</h1>;
}`,
  },

  checks: [
    staticCheck(
      "unique-id",
      "A requirement, phrased as a statement",
      "A hint that points to where to look without giving the answer.",
      (a) => a.hasNamedImport("react", "useState"),
    ),
  ],

  // Steer the mentor. Keep it short; the app adds the rules and the format.
  mentorFocus: "What to emphasise once the checks have run.",

  estimatedTime: 15, // minutes
  tags: ["tag-one", "tag-two"],
};
