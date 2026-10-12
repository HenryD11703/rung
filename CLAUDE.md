# CLAUDE.md — technical guide for this repo

React practice platform: 12 exercises, in-browser editor (Sandpack), **automated checks decide pass/fail**, an AI mentor only explains. Product name: **Rung** (formerly "Junior to Mid"; chosen by the author). The GitHub repo is `HenryD11703/rung` (renamed from `learn_react_j2m`; old URLs redirect).

Context about the author and the bigger project lives outside this repo, in `henry-b/ESTADO-ACTUAL.md`. Chat with the author is in Spanish; everything in this repo (UI, code, docs, commits) is **English**.

## Commands

```bash
npm install
cp .env.example .env     # GROQ_API_KEY is only needed for the AI mentor; the build never needs it
npm run dev              # http://localhost:3000
npm run check            # eslint + tsc + vitest (run before every commit)
npm run test:e2e         # builds, starts on :3100, runs Playwright (desktop + mobile)
```

Before `test:e2e`, stop anything listening on port 3100. Locally Playwright reuses an existing server, and a stale build gives confusing failures.

## Architecture in one screen

```
app/
  page.tsx, exercises/[slug]/page.tsx, not-found.tsx
  api/review/route.ts        only exports POST/runtime (Next rejects other exports here)
  components/{home,ui,workspace}
  content/react-basics/*.ts  one exercise per file (starter, solution, checks)
  content/predicates.ts      shared helpers for writing checks
  lib/analysis/              acorn AST helpers + pure-logic runtime (Web Worker)
  lib/checks.ts              runChecks(): used by browser AND server
  lib/review/                schema, prompt, cache, rate-limit, llm (Groq)
  lib/exercises-registry.ts  curriculum order
tests/unit  tests/e2e        Vitest / Playwright
docs/ARCHITECTURE.md         why it is built this way + alternatives considered
```

Read `docs/ARCHITECTURE.md` before changing the review flow.

## Rules that must not be broken

1. **Pass/fail comes from checks, never from the model.** The mentor receives failed checks + changed files and writes feedback only.
2. **Never execute student code on the server.** `node:vm` is not a sandbox. Runtime checks run in a Web Worker in the browser; the server only accepts ids of runtime checks that exist.
3. **The server owns the prompt.** The client sends `slug`, `files`, `runtimeFailed` and nothing else. Do not accept instructions from the client.
4. **Student code is data.** It stays fenced and escaped in the prompt; output is validated with zod.
5. **The API key is read lazily** (`lib/review/llm.ts`). Importing modules must not require it, or builds and CI break.
6. **Tests never call the real model.** E2E fixtures block `/api/review` unless a test mocks it.
7. **No secrets in git.** `.env*` is ignored; `.env.example` is the only exception.

## Adding or changing exercises

Follow `CONTRIBUTING.md`. In short: copy `content/react-basics/template.ts`, register it, and make these pass:

- the starter fails and passes **no** check (nothing passes vacuously);
- the reference solution passes **every** check;
- add a mutation in `tests/unit/mutations.test.ts` that breaks one thing and fails **exactly** the expected checks.

Sandpack file paths use a **leading slash** (`/App.js`). Check helpers match files by suffix, so `a.calls("x", "App.js")` works.

## Design system (keep it consistent)

- Direction: **"Signal"** (dark, chosen by the author out of three explored; a light theme is planned for later).
- Tokens are CSS variables in `app/globals.css`: `canvas #0b0b0c`, `raised`, `fg #f3f3f0`, `muted`, one accent lime `#dfff3f`; `ok`/`bad` only for check results. Use the semantic classes (`bg-canvas`, `text-muted`, `border-line`, `rounded-ui`).
- Fonts: Inter Tight for display (`.display`; small headings set `[--display-tracking:-0.022em]` so they are not cramped), Inter for text, JetBrains Mono for labels (`.label`).
- Swiss structure: faint 12-column grid in the hero, hairline rules, numbered rows, large tabular numerals. No gradients, no emojis in the UI, no purple, no heavy rounded cards.
- Mobile: panes become tabs under `lg`. Touch targets are at least 44px. A test fails on horizontal overflow.
- Desktop: three draggable dividers (`components/workspace/ResizeHandle.tsx`, state in `lib/workspace-layout.ts`, saved under `rung:layout:v1`). They sit on the *inner* edge of the pane after the divider so they never cover a scrollbar. While dragging, `[data-dragging] iframe` loses pointer events so the preview cannot steal the drag. Do not name a file `layout.ts` inside `app/`: Next treats it as a special file.

## Known facts worth remembering

- Groq retires models. The original `llama-3.3-70b-versatile` returns 404. Default is `openai/gpt-oss-120b`; override with `GROQ_MODEL`. A 404/401 from the provider is reported as "unavailable" and logged with a hint.
- The rate limiter is in-memory per instance unless `UPSTASH_REDIS_REST_*` is set. On serverless that means per instance.
- Sandpack's bundler loads from CodeSandbox's CDN, so the preview needs internet. Checks do not.
- Progress is stored in `localStorage` (`rung:progress:v1`). The old `j2m:progress:v1` key is migrated automatically on first read.
- `npm audit --omit=dev` is clean. The remaining audit findings are dev-tooling only.

## Status

Released as `v1.0.0` on `main`. Day-to-day work goes on short-lived branches (`feat/...`, `fix/...`) merged into `main`.
