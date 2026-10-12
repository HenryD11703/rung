/**
 * Behaviour checks for *pure* logic (e.g. a reducer).
 *
 * The pure top-level declarations of a student's file are extracted and run
 * against a scenario. In the browser this happens inside a Web Worker that is
 * terminated after a timeout, so an infinite loop cannot freeze the page.
 *
 * It intentionally never runs on the server: `node:vm` is not a security
 * boundary, so student code must not be executed there.
 */

const PRELUDE = `
const __freeze = (value) => {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(__freeze);
  }
  return value;
};
`;

export function buildProgram(declarations: string, scenario: string): string {
  return `(function () {
"use strict";
${PRELUDE}
${declarations}
return (function () {
${scenario}
})();
})()`;
}

/** Synchronous evaluation. Used by unit tests, never in the app. */
export function evaluateProgram(program: string): boolean {
  try {
    return (0, eval)(program) === true;
  } catch {
    return false;
  }
}

const WORKER_SOURCE = `
self.onmessage = (event) => {
  try {
    const result = (0, eval)(event.data);
    self.postMessage({ ok: result === true });
  } catch (error) {
    self.postMessage({ ok: false, error: String(error) });
  }
};
`;

export function runProgramInWorker(
  program: string,
  timeoutMs = 1500,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof Worker === "undefined") return resolve(false);

    const url = URL.createObjectURL(
      new Blob([WORKER_SOURCE], { type: "text/javascript" }),
    );
    const worker = new Worker(url);
    const finish = (ok: boolean) => {
      clearTimeout(timer);
      worker.terminate();
      URL.revokeObjectURL(url);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);

    worker.onmessage = (event) => finish(event.data?.ok === true);
    worker.onerror = () => finish(false);
    worker.postMessage(program);
  });
}
