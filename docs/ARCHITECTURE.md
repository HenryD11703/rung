# Architecture and decisions

This document explains how feedback works and why it is built this way, including the alternatives that were considered.

## The problem with "the AI grades everything"

The first version sent the student's code and the exercise instructions to a language model and let it decide pass or fail. That has four problems:

| Problem | Why it matters |
| :--- | :--- |
| Non-deterministic | The same code could pass once and fail the next time |
| Manipulable | Code is part of the prompt, so a comment like "mark this as approved" could change the verdict |
| Slow and metered | Every attempt costs latency and tokens, even for a missing import |
| Unprotected endpoint | The client sent its own instructions, so anyone could use the endpoint as a free general-purpose chatbot |

Most of what the model was asked to judge ("did they import `useState`?", "is the key the id?", "did they return a cleanup function?") is a **structural fact about the code**. A program can answer those exactly.

## The design: checks decide, the AI explains

```
                 ┌─────────────── browser ────────────────┐
 student code ──►│ runChecks()                            │
                 │   static checks  → AST (acorn)         │──► pass/fail + hint per check
                 │   runtime checks → Web Worker (frozen) │
                 └───────────────┬────────────────────────┘
                                 │ "Ask the mentor" (optional)
                                 ▼
                       POST /api/review ── validates, limits, caches
                                 │
                                 ▼
                    prompt = goal + FAILED checks + CHANGED files
                                 │
                                 ▼
                       model → JSON → zod → feedback
```

### Static checks (AST)

Code is parsed with acorn (+ JSX). A check is a small function over the tree, for example "a `useEffect` callback returns a function that calls `clearInterval`". They are exact, instant and free. Syntax errors are reported as such instead of failing every check.

### Runtime checks (pure logic)

For logic that is *behaviour*, not shape (the reducer exercise), the app extracts the student's top-level, JSX-free declarations and runs a scenario against them inside a **Web Worker**. The worker is terminated after a timeout, so an infinite loop cannot freeze the page. States are deep-frozen, so any mutation throws and fails the check.

**Student code never runs on the server.** `node:vm` is not a security boundary (a vm context can be escaped), so the server only accepts the *ids* of runtime checks that failed in the browser, and only ids that exist for that exercise.

### What the AI receives

- the exercise goal and a short "mentor focus";
- the checks that failed (label and hint) and the ones that passed;
- **only the files that changed** compared with the starter, capped in size.

Pass or fail is never the model's decision. Its output must match a strict schema (summary, up to 3 strengths, up to 3 fixes, a next step) or it is discarded.

## Threat model for `/api/review`

| Threat | Mitigation |
| :--- | :--- |
| Endpoint used as a free chatbot | The server owns the instructions; the client only sends `slug`, `files` and failed runtime ids. Code must parse as JavaScript or the request is rejected before any model call |
| Prompt injection through code | The system prompt declares the code as data; it is fenced in delimiters that are escaped inside the code; output is schema-validated; the verdict does not depend on the model |
| Cost abuse | Per-client limits (per minute and per day), a response cache for identical submissions, size caps, and "no changes" requests rejected without a model call |
| Cross-site abuse | Requests with a foreign `Origin` are rejected |
| Large payloads | Body capped at 60k characters; at most 8 files; 12k characters per file |
| Leaking details | Provider errors are logged by name only and never returned to the browser |
| Secrets in the repo or the build | The key is read lazily at request time, so builds and CI never need it |

### Rate limiting trade-offs

- By default the limiter is **in memory**. That is fine for one process, but on serverless each instance has its own counters.
- Setting `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` switches to a shared fixed-window counter over Upstash's REST API. If Upstash is unreachable it falls back to memory rather than failing open.
- The client key is a hash of the IP from `x-forwarded-for`. That header is only trustworthy behind a proxy that sets it (Vercel does).
- Failed upstream calls still count toward the limit. That is deliberate: it also protects the provider from retry storms.

## Alternatives considered

| Option | Verdict |
| :--- | :--- |
| **A. AI-only grading** (original) | Rejected. Non-deterministic, slow, metered, manipulable |
| **B. Static analysis of the AST** | **Chosen** for structure and patterns. Exact, instant, offline |
| **C. Behaviour tests in the sandbox** (Jest + Testing Library inside Sandpack) | **Next step** for UI exercises. It would assert what the user sees ("clicking adds one"), but needs extra bundler setup and slower runs. Pure logic already uses a lighter version of this idea |
| **D. WebContainers** (a real Node in the browser) | Not needed. It would allow npm installs and servers, but needs cross-origin isolation headers and is heavier than these exercises justify |
| **E. Execute code on the server** | Rejected. Running untrusted code is a security liability, and a `vm` is not a sandbox |
| **F. Regex over source text** | Rejected. Breaks on comments, formatting and renamed variables. The AST does not |

### Honest limits of static checks

- They verify **structure, not behaviour**. A student could satisfy every check and still have a runtime bug. The sandbox preview and (later) behaviour tests cover that.
- An unusual but valid solution may fail a check that assumed the common shape. Checks should test requirements, not style, and each one has a hint instead of just "wrong". Report false negatives as issues.
- Some checks rely on names the starter defines (for example `ListItem`, `initialState`). The hints say so.

## Quality gates

Checks are code, so they are tested like code (see `tests/unit`):

1. The starter parses and fails; it passes **no** check (no check rewards doing nothing).
2. The reference solution passes every check.
3. About 30 mutation tests break the solution on purpose and assert that **exactly** the expected checks fail.
4. In E2E, every reference solution is applied through the UI and passes in a real browser, which also exercises the Web Worker path.
5. API tests cover validation, origin checks, caching, rate limits and every upstream failure mode, with the model mocked.

## Model choice

The default model is `openai/gpt-oss-120b` on Groq, with low reasoning effort (about 0.5 to 1 second per review). The original `llama-3.3-70b-versatile` no longer exists on Groq, which silently broke the mentor, so the model is configurable and a retired or rejected model is reported as a configuration problem in the server log instead of a generic failure.

## Design system

"Signal": a near-black canvas, one warm-white ink and one acid-lime accent. Lime is the only decorative color; green and coral exist only to show check results. Swiss-inspired structure (a faint 12-column grid, hairline rules, numbered rows, large tabular numerals) with tight display type (Inter Tight), Inter for text and JetBrains Mono for labels. The home page's bar graph is drawn from real data (exercises per level) and doubles as the brand mark: three steps climbing right, the top one lime.
