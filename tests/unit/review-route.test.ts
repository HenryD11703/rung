import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/review/llm", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/review/llm")>()),
  complete: vi.fn(),
}));

import { POST } from "@/api/review/route";
import { LlmUnavailableError, complete } from "@/lib/review/llm";
import { resetRateLimits } from "@/lib/review/rate-limit";
import { reviewCache } from "@/lib/review/store";
import { getExerciseBySlug } from "@/lib/exercises-registry";

const mockedComplete = vi.mocked(complete);

const GOOD_FEEDBACK = JSON.stringify({
  summary: "Solid start.",
  strengths: ["Clean state declaration."],
  fixes: ["Consider the functional update form."],
  nextStep: "Try the next exercise.",
});

const counter = getExerciseBySlug("state-counter")!;
const customHooks = getExerciseBySlug("custom-hooks")!;

/** Valid JS that differs from the starter, so it counts as "changed". */
const brokenCounter = {
  "/App.js": `import React from 'react';
export default function Counter() {
  let count = 0;
  return <button onClick={() => { count++; }}>{count}</button>;
}`,
};

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new Request("http://localhost:3000/api/review", {
      method: "POST",
      headers: { "content-type": "application/json", host: "localhost:3000", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

const submit = (files: Record<string, string> = brokenCounter, extra = {}) =>
  post({ slug: counter.slug, files, ...extra });

beforeEach(() => {
  vi.clearAllMocks();
  mockedComplete.mockResolvedValue(GOOD_FEEDBACK);
  resetRateLimits();
  reviewCache.clear();
  delete process.env.REVIEW_LIMIT_PER_MINUTE;
});

describe("POST /api/review: input validation", () => {
  it("rejects requests from another origin", async () => {
    const res = await submit(undefined, undefined);
    expect(res.status).toBe(200);
    const foreign = await post(
      { slug: counter.slug, files: brokenCounter },
      { origin: "https://evil.example" },
    );
    expect(foreign.status).toBe(403);
    expect((await foreign.json()).error.code).toBe("forbidden_origin");
  });

  it("accepts a same-origin request", async () => {
    const res = await post(
      { slug: counter.slug, files: brokenCounter },
      { origin: "http://localhost:3000" },
    );
    expect(res.status).toBe(200);
  });

  it("rejects oversized bodies without calling the model", async () => {
    const res = await post("x".repeat(70_000));
    expect(res.status).toBe(413);
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON", async () => {
    const res = await post("{nope");
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_json");
  });

  it.each([
    ["missing slug", { files: brokenCounter }],
    ["no files", { slug: counter.slug, files: {} }],
    ["file content not a string", { slug: counter.slug, files: { "/App.js": 42 } }],
    ["one huge file", { slug: counter.slug, files: { "/App.js": "a".repeat(13_000) } }],
  ])("rejects a malformed request: %s", async (_name, body) => {
    const res = await post(body);
    expect(res.status).toBe(400);
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it("returns 404 for an unknown exercise", async () => {
    const res = await post({ slug: "does-not-exist", files: brokenCounter });
    expect(res.status).toBe(404);
  });

  it("rejects files the exercise does not have", async () => {
    const res = await submit({ ...brokenCounter, "/evil.js": "export default 1" });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("unknown_file");
  });

  it("rejects code that does not parse, without calling the model", async () => {
    const res = await submit({ "/App.js": "this is not javascript at all {{{" });
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("syntax_error");
    expect(body.error.issues[0].file).toBe("/App.js");
    expect(mockedComplete).not.toHaveBeenCalled();
  });

  it("rejects an untouched starter without calling the model", async () => {
    const res = await submit(counter.files);
    expect(res.status).toBe(422);
    expect((await res.json()).error.code).toBe("no_changes");
    expect(mockedComplete).not.toHaveBeenCalled();
  });
});

describe("POST /api/review: the AI call", () => {
  it("returns feedback and tells the model which checks failed", async () => {
    const res = await submit();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.feedback.summary).toBe("Solid start.");
    expect(body.cached).toBe(false);
    expect(body.failed).toContain("named-import");

    expect(mockedComplete).toHaveBeenCalledTimes(1);
    const prompt = mockedComplete.mock.calls[0][0].map((m) => m.content).join("\n");
    expect(prompt).toContain("Imports { useState } from 'react'");
    expect(prompt).toContain("Failed:");
  });

  it("sends only the files that changed", async () => {
    const solution = customHooks.solution;
    const res = await post({
      slug: customHooks.slug,
      files: { ...customHooks.files, "/App.js": solution["/App.js"] },
    });
    expect(res.status).toBe(200);

    const prompt = mockedComplete.mock.calls[0][0].map((m) => m.content).join("\n");
    expect(prompt).toContain('<student_file name="App.js">');
    expect(prompt).not.toContain('<student_file name="hooks/useFetch.js">');
    expect(prompt).not.toContain('<student_file name="styles.css">');
  });

  it("serves identical submissions from the cache", async () => {
    const first = await (await submit()).json();
    const second = await (await submit()).json();

    expect(first.cached).toBe(false);
    expect(second.cached).toBe(true);
    expect(second.feedback).toEqual(first.feedback);
    expect(mockedComplete).toHaveBeenCalledTimes(1);
  });

  it("recomputes failed checks on the server instead of trusting the client", async () => {
    // The client claims nothing failed; the server must still find the issues.
    const res = await submit(brokenCounter, { runtimeFailed: [] });
    expect((await res.json()).failed.length).toBeGreaterThan(0);
  });

  it("only accepts runtime check ids that really exist", async () => {
    const reducer = getExerciseBySlug("usereducer-undo-redo")!;
    const files = { "/App.js": reducer.files["/App.js"] + "\n// edited" };
    const res = await post({
      slug: reducer.slug,
      files,
      runtimeFailed: ["redo-restores", "made-up-id"],
    });
    const body = await res.json();
    expect(body.failed).toContain("redo-restores");
    expect(body.failed).not.toContain("made-up-id");
  });
});

describe("POST /api/review: abuse protection", () => {
  it("rate limits per client and sets Retry-After", async () => {
    process.env.REVIEW_LIMIT_PER_MINUTE = "2";
    const ip = { "x-forwarded-for": "203.0.113.7" };

    // Different code each time so the cache cannot absorb the requests.
    const attempt = (n: number) =>
      post(
        { slug: counter.slug, files: { "/App.js": brokenCounter["/App.js"] + `\n// ${n}` } },
        ip,
      );

    expect((await attempt(1)).status).toBe(200);
    expect((await attempt(2)).status).toBe(200);
    const limited = await attempt(3);

    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect((await limited.json()).error.code).toBe("rate_limited");
    expect(mockedComplete).toHaveBeenCalledTimes(2);
  });

  it("limits each client separately", async () => {
    process.env.REVIEW_LIMIT_PER_MINUTE = "1";
    const files = (n: number) => ({ "/App.js": brokenCounter["/App.js"] + `\n// ${n}` });

    expect((await post({ slug: counter.slug, files: files(1) }, { "x-forwarded-for": "198.51.100.1" })).status).toBe(200);
    expect((await post({ slug: counter.slug, files: files(2) }, { "x-forwarded-for": "198.51.100.2" })).status).toBe(200);
  });

  it("cache hits do not consume the rate limit", async () => {
    process.env.REVIEW_LIMIT_PER_MINUTE = "1";
    expect((await submit()).status).toBe(200);
    for (let i = 0; i < 5; i++) expect((await submit()).status).toBe(200);
    expect(mockedComplete).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/review: upstream failures", () => {
  it("returns 502 without leaking details when the model output is invalid", async () => {
    mockedComplete.mockResolvedValue("not json at all, secret-detail-123");
    const res = await submit();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("secret-detail-123");
  });

  it("returns 502 when the output has the wrong shape", async () => {
    mockedComplete.mockResolvedValue(JSON.stringify({ hello: "world" }));
    expect((await submit()).status).toBe(502);
  });

  it("returns 502 when the provider throws", async () => {
    mockedComplete.mockRejectedValue(new Error("401 invalid api key sk-live-abc"));
    const res = await submit();
    expect(res.status).toBe(502);
    expect(JSON.stringify(await res.json())).not.toContain("sk-live-abc");
  });

  it("returns 503 when the API key is not configured", async () => {
    mockedComplete.mockRejectedValue(new LlmUnavailableError());
    const res = await submit();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("unavailable");
  });

  it("truncates over-long model output instead of failing", async () => {
    mockedComplete.mockResolvedValue(
      JSON.stringify({ summary: "s".repeat(2_000), strengths: [], fixes: ["f".repeat(2_000)] }),
    );
    const body = await (await submit()).json();
    expect(body.feedback.summary.length).toBeLessThanOrEqual(280);
    expect(body.feedback.fixes[0].length).toBeLessThanOrEqual(420);
  });
});
