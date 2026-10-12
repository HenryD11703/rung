# Contributing

Thanks for helping. The most valuable contributions are **new exercises** and **better checks**. This guide covers both.

## Setup

```bash
npm install
npm run check        # lint + types + unit tests
npm run test:e2e     # builds the app, runs Playwright (desktop + mobile)
```

You do not need a Groq key to work on exercises or checks.

## Adding an exercise

1. Copy `app/content/react-basics/template.ts` to a new file, for example `use-id.ts`.
2. Fill in every field (see below).
3. Register it in `app/lib/exercises-registry.ts`. The order there is the order of the curriculum.
4. Run `npm test`. Four quality gates run automatically (see "What the tests enforce").
5. Add mutation tests for any check that is not trivial (see below).
6. Run `npm run test:e2e` once. It opens your solution in a real browser and runs the checks.

### The fields

| Field | Guidance |
| :--- | :--- |
| `slug` | kebab-case, unique. It becomes the URL (`/exercises/<slug>`) |
| `title` | `Concept: What the Student Builds` |
| `objective` | One sentence that starts with a verb |
| `steps` | 4 to 6 imperative steps. Every step should map to at least one check |
| `hints` | Questions a stuck student would really ask. Short answer with a minimal snippet, never the full solution |
| `theory` | `introduction`, then `goodPractices` and `badPractices` (each with the *reason*), then `examples` |
| `files` | The starter code. Sandpack paths with a leading slash. **It must fail every check** |
| `solution` | A passing solution with the same files as the starter |
| `checks` | Everything that can be verified without AI. See below |
| `mentorFocus` | One or two sentences steering the AI mentor |
| `estimatedTime` | Real minutes it took you, plus 50% |

### Writing checks

A check is a requirement the app can verify:

```ts
staticCheck(
  "key-from-id",                                    // unique id inside the exercise
  "Each item has a stable key taken from its id",   // the requirement, as a statement
  "Use key={task.id}. Do not use the index.",       // shown when it fails; points, doesn't solve
  (a) => /* inspect the code through `a` */ true,
)
```

`a` is a `CodeAnalysis` (see `app/lib/analysis`). Useful helpers: `a.hasNamedImport`, `a.calls`, `a.stateHooks`, `a.declaredFunction`, `a.jsx`, plus the shared predicates in `app/content/predicates.ts`.

For **pure logic** (a reducer, a utility) use `runtimeCheck(...)`. It runs your scenario against the student's functions inside a Web Worker. States are frozen first, so accidental mutation fails the check.

Rules of thumb:

- **Check requirements, not style.** If two valid solutions exist, accept both.
- **Phrase labels as requirements** ("Imports { useState } from 'react'"), not as questions.
- **Guards must not pass by default.** "Does not mutate state" should only pass once state updates exist. A test fails otherwise.
- **Keep hints useful but incomplete.** They are the product.
- Prefer a few precise checks to many fragile ones. 5 to 9 is typical.

### What the tests enforce

`npm test` runs these for every registered exercise:

1. the starter parses and fails at least one check;
2. the starter passes **no** check (nothing passes vacuously);
3. the reference solution passes every check;
4. the solution has the same files as the starter.

### Mutation tests

For checks that look for a specific mistake, add a broken variant of the solution to `tests/unit/mutations.test.ts`:

```ts
{
  slug: "lists-and-keys",
  name: "uses the index as key",
  apply: (s) => swap(swap(s, "App.js", "tasks.map((task) =>", "tasks.map((task, index) =>"),
                     "App.js", "key={task.id}", "key={index}"),
  fails: ["key-from-id"],   // exactly these checks must fail, nothing else
}
```

This proves the check catches the mistake and that it does not break unrelated checks.

## Changing the AI mentor or the API

- The mentor must stay an *explainer*. Pass or fail comes from the checks.
- Student code is untrusted data. It must never be executed on the server and never be able to change the prompt's rules.
- Anything that adds a request path needs a test in `tests/unit/review-route.test.ts`.
- Tests never call the real model. The E2E fixtures block `/api/review` unless a test mocks it.

## Pull requests

- [ ] `npm run check` passes
- [ ] `npm run test:e2e` passes (for UI or exercise changes)
- [ ] New exercises have a solution, checks, and at least one mutation test
- [ ] No secrets, no `.env` files
- [ ] Copy is in English

Small, focused PRs are easier to review.
