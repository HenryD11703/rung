import { describe, expect, it } from "vitest";
import { getExerciseBySlug } from "@/lib/exercises-registry";
import { runChecks } from "@/lib/checks";
import { evaluateProgram } from "@/lib/analysis/runtime";

const executor = async (program: string) => evaluateProgram(program);

type Files = Record<string, string>;

/** Replace exactly one snippet. Fails loudly if the snippet is missing. */
const swap = (files: Files, file: string, from: string, to: string): Files => {
  const key = Object.keys(files).find((k) => k.endsWith(file))!;
  expect(files[key], `"${from}" not found in ${file}`).toContain(from);
  return { ...files, [key]: files[key].replace(from, to) };
};

interface Mutation {
  slug: string;
  name: string;
  apply: (solution: Files) => Files;
  /** Check ids that must fail. Every other check must still pass. */
  fails: string[];
}

const mutations: Mutation[] = [
  // --- counter ---
  {
    slug: "state-counter",
    name: "uses React.useState instead of the named import",
    apply: (s) =>
      swap(
        swap(s, "App.js", "import { useState } from 'react';", "import React from 'react';"),
        "App.js",
        "= useState(0)",
        "= React.useState(0)",
      ),
    fails: ["named-import", "no-react-namespace"],
  },
  {
    slug: "state-counter",
    name: "mutates the counter directly",
    apply: (s) => swap(s, "App.js", "setCount(count + 1)", "{ count++; }"),
    fails: ["button-updates-state", "adds-one", "no-direct-mutation"],
  },
  // --- lists and keys ---
  {
    slug: "lists-and-keys",
    name: "uses the index as key",
    apply: (s) =>
      swap(
        swap(s, "App.js", "tasks.map((task) =>", "tasks.map((task, index) =>"),
        "App.js",
        "key={task.id}",
        "key={index}",
      ),
    fails: ["key-from-id"],
  },
  {
    slug: "lists-and-keys",
    name: "uses a random key",
    apply: (s) => swap(s, "App.js", "key={task.id}", "key={Math.random()}"),
    fails: ["key-from-id"],
  },
  {
    slug: "lists-and-keys",
    name: "removes with splice (mutation) and a non-functional update",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "setTasks(prev => prev.filter(task => task.id !== id));",
        "const copy = tasks; copy.splice(tasks.findIndex(t => t.id === id), 1); setTasks(copy);",
      ),
    fails: ["remove-uses-filter", "functional-update", "no-mutation"],
  },
  // --- conditional rendering ---
  {
    slug: "conditional-rendering",
    name: "branches with a switch and an if/else chain",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "const current = CONFIGS[status];",
        "let current; switch (status) { case 'success': current = CONFIGS.success; break; default: current = CONFIGS.error; }",
      ),
    fails: ["lookup-by-status", "no-branch-chains"],
  },
  {
    slug: "conditional-rendering",
    name: "hardcodes the background",
    apply: (s) => swap(s, "App.js", "background: current.color", "background: '#ccc'"),
    fails: ["dynamic-background"],
  },
  // --- effects ---
  {
    slug: "effects-cleanup",
    name: "never cleans up the interval",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "return () => {\n      console.log('Cleaning up...');\n      clearInterval(id);\n    };",
        "",
      ),
    fails: ["cleanup-returned"],
  },
  {
    slug: "effects-cleanup",
    name: "runs the cleanup immediately",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "return () => {\n      console.log('Cleaning up...');\n      clearInterval(id);\n    };",
        "return clearInterval(id);",
      ),
    fails: ["cleanup-returned", "no-immediate-clear"],
  },
  {
    slug: "effects-cleanup",
    name: "reads a stale value instead of the functional update",
    apply: (s) => swap(s, "App.js", "setSeconds(s => s + 1)", "setSeconds(seconds + 1)"),
    fails: ["functional-update"],
  },
  // --- lifting state ---
  {
    slug: "lifting-state",
    name: "keeps a copy of the state inside the input",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "function InputComponent({ value, onChange }) {",
        "function InputComponent({ value, onChange }) {\n  const [local] = useState('');",
      ),
    fails: ["input-has-no-state"],
  },
  {
    slug: "lifting-state",
    name: "reads the DOM instead of using props",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "{text}\n      </p>",
        "{document.getElementById('x')?.value}\n      </p>",
      ),
    fails: ["display-renders-prop", "no-dom-queries"],
  },
  // --- fetching ---
  {
    slug: "robust-data-fetching",
    name: "ignores non-ok responses",
    apply: (s) =>
      swap(s, "App.js", "if (!res.ok) throw new Error('We could not load the data');", ""),
    fails: ["checks-res-ok"],
  },
  {
    slug: "robust-data-fetching",
    name: "never turns loading off in finally",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "} finally {\n        setLoading(false);\n      }",
        "} finally {\n      }",
      ),
    fails: ["finally-turns-off-loading"],
  },
  {
    slug: "robust-data-fetching",
    name: "only logs the error to the console",
    apply: (s) =>
      swap(
        swap(s, "App.js", "setError(err.message);", "console.error(err);"),
        "App.js",
        "if (error) return <p style={{ padding: '20px', color: 'red' }}>{error}</p>;",
        "",
      ),
    fails: ["renders-error"],
  },
  // --- custom hooks ---
  {
    slug: "custom-hooks",
    name: "keeps fetching inside the component",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "export default function App() {",
        "export default function App() {\n  fetch('/x');",
      ),
    fails: ["app-is-clean"],
  },
  {
    slug: "custom-hooks",
    name: "hardcodes the URL inside the hook",
    apply: (s) =>
      swap(s, "useFetch.js", "await fetch(url)", "await fetch('https://example.com/api')"),
    fails: ["no-hardcoded-url"],
  },
  {
    slug: "custom-hooks",
    name: "forgets url in the dependency array",
    apply: (s) => swap(s, "useFetch.js", "}, [url]);", "}, []);"),
    fails: ["url-in-dependencies"],
  },
  // --- context ---
  {
    slug: "context-theme-switcher",
    name: "prop drills the theme",
    apply: (s) => swap(s, "App.js", "<Navbar />", "<Navbar theme='light' />"),
    fails: ["no-prop-drilling"],
  },
  {
    slug: "context-theme-switcher",
    name: "forgets to expose toggleTheme in value",
    apply: (s) => swap(s, "ThemeContext.js", "value={{ theme, toggleTheme }}", "value={{ theme }}"),
    fails: ["provider-value"],
  },
  // --- forms ---
  {
    slug: "controlled-forms",
    name: "overwrites the object instead of spreading",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "setFormData((prev) => ({ ...prev, [name]: value }));",
        "setFormData({ [name]: value });",
      ),
    fails: ["spread-update"],
  },
  {
    slug: "controlled-forms",
    name: "forgets preventDefault",
    apply: (s) => swap(s, "App.js", "e.preventDefault();", ""),
    fails: ["prevent-default"],
  },
  {
    slug: "controlled-forms",
    name: "leaves the select uncontrolled",
    apply: (s) => swap(s, "App.js", "value={formData.role}", ""),
    fails: ["fields-are-controlled"],
  },
  // --- refs ---
  {
    slug: "useref-dom-and-persistence",
    name: "uses state for the secret counter",
    apply: (s) =>
      swap(
        swap(s, "App.js", "const secretClicks = useRef(0);", "const [secretClicks, setSecret] = useState(0);"),
        "App.js",
        "secretClicks.current += 1;\n    alert('Secret clicks: ' + secretClicks.current);",
        "setSecret(secretClicks + 1);",
      ),
    fails: [
      "counter-ref",
      "no-state-for-counter",
      "increments-current",
      "reports-value",
    ],
  },
  // --- performance ---
  {
    slug: "performance-memoization",
    name: "passes an inline function to the memoized item",
    apply: (s) =>
      swap(s, "App.js", "onSelect={handleSelect}", "onSelect={(i) => handleSelect(i)}"),
    fails: ["no-inline-function-props"],
  },
  {
    slug: "performance-memoization",
    name: "forgets memo and leaves a console.log",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "memo(function ListItem({ item, onSelect }) {",
        "(function ListItem({ item, onSelect }) {\n  console.log('render');",
      ),
    fails: ["wrapped-in-memo", "no-leftover-logs"],
  },
  // --- reducer (behaviour) ---
  {
    slug: "usereducer-undo-redo",
    name: "does not clear the future on a new change",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "present: action.payload,\n        future: []",
        "present: action.payload,\n        future",
      ),
    fails: ["new-change-clears-future"],
  },
  {
    slug: "usereducer-undo-redo",
    name: "mutates history with push",
    apply: (s) =>
      swap(
        s,
        "App.js",
        "past: [...past, present],\n        present: action.payload,",
        "past: (past.push(present), past),\n        present: action.payload,",
      ),
    fails: [
      "set-text-records-history",
      "undo-moves-present-to-future",
      "redo-restores",
      "new-change-clears-future",
      "no-mutating-methods",
    ],
  },
  {
    slug: "usereducer-undo-redo",
    name: "UNDO forgets to queue the present in future",
    apply: (s) => swap(s, "App.js", "future: [present, ...future]", "future"),
    fails: ["undo-moves-present-to-future", "redo-restores"],
  },
  {
    slug: "usereducer-undo-redo",
    name: "UNDO crashes on empty history",
    apply: (s) => swap(s, "App.js", "if (past.length === 0) return state;", ""),
    fails: ["empty-history-is-safe"],
  },
];

describe("checks catch broken solutions", () => {
  it.each(mutations.map((m) => [`${m.slug}: ${m.name}`, m] as const))(
    "%s",
    async (_label, mutation) => {
      const exercise = getExerciseBySlug(mutation.slug)!;
      const report = await runChecks(exercise, mutation.apply(exercise.solution), executor);

      expect(report.issues, "mutation produced a syntax error").toEqual([]);
      const failed = report.results.filter((r) => r.passed === false).map((r) => r.id);

      for (const id of mutation.fails) {
        expect(failed, `expected "${id}" to fail`).toContain(id);
      }
      // No collateral damage: nothing else should break.
      expect(failed.sort()).toEqual([...mutation.fails].sort());
    },
  );
});
