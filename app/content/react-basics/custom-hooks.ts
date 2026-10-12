import type { Exercise } from "@/types";
import { type AstNode, containsCall, keyName, mentions } from "@/lib/analysis";
import { staticCheck } from "../predicates";

const HOOK = "hooks/useFetch.js";
const APP = "App.js";

export const customHooksExercise: Exercise = {
  slug: "custom-hooks",
  title: "Divide & Conquer: Custom Hooks",
  difficulty: "medium",

  objective:
    "Separate business logic from the UI by extracting data fetching into a reusable, generic Custom Hook.",

  steps: [
    "Open `hooks/useFetch.js` and move the state (`data`, `loading`, `error`) and the `useEffect` into it.",
    "Make the Hook generic: it receives a `url` parameter.",
    "Return an object `{ data, loading, error }`.",
    "Refactor `App.js` to call `useFetch` and remove every trace of fetching from the component.",
    "Render the loading state, the error, and the list of products.",
  ],

  hints: [
    {
      question: "How should I export the Hook?",
      answer:
        "Use a named export so autocompletion works well:\n\n`export function useFetch(url) { ... }`",
    },
    {
      question: "How do I rename the data when I use the Hook?",
      answer: `Because the Hook returns an object you can rename while destructuring:

const { data: products, loading } = useFetch(url);`,
    },
    {
      question: "What should the Hook return?",
      answer:
        "Whatever the component needs. An object is ideal here:\n\n`return { data, loading, error };`",
    },
    {
      question: "What goes in the dependency array?",
      answer:
        "Everything the effect reads from outside. The effect uses `url`, so `[url]` makes it refetch when the URL changes.",
    },
  ],

  theory: {
    title: "The magic of Custom Hooks",
    introduction:
      "A component should have one job: **describe the UI**. When it also calls APIs, validates data and runs timers it becomes a hard-to-maintain 'fat component'. Custom Hooks let you extract that logic and reuse it anywhere.",
    goodPractices: [
      "The `use` prefix is required so React can enforce the rules of Hooks.",
      "Return an object: callers can destructure only what they need.",
      "Keep Hooks generic by passing parameters such as the `url`.",
    ],
    badPractices: [
      "UI inside the Hook. A Hook returns data and functions, never JSX.",
      "Conditional Hook calls. Never call a Hook inside an `if` or a loop.",
      "Coupling the Hook to one specific component.",
    ],
    examples: [
      "// Using the custom hook\nconst { data, loading } = useFetch(API_URL);",
      "// Minimal structure\nfunction useSomething() {\n  useEffect(() => {}, []);\n  return result;\n}",
    ],
  },

  files: {
    "/App.js": `import React from 'react';
import { useFetch } from "./hooks/useFetch";
import './styles.css';

export default function App() {
  // 1. Use your new useFetch hook here
  // URL: 'https://fakestoreapi.com/products?limit=5'

  // 2. Extract data, loading and error (you can rename data to products)

  // Tip: keep only rendering logic here (if loading, if error...)

  return (
    <div className="container">
      <h1>FakeStore Products</h1>
      <div className="grid">
        {/* 3. Map your products here */}
      </div>
    </div>
  );
}`,

    "/hooks/useFetch.js": `import { useState, useEffect } from 'react';

// Tip: export the function directly
export function useFetch(url) {
  // 1. Declare your states (data, loading, error)

  // 2. Implement the useEffect with the fetch

  // 3. Don't forget to return the object with the results!
  return { };
}`,

    "/styles.css": `
.container { padding: 20px; font-family: sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
.card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; }
.card img { height: 80px; object-fit: contain; }
.loader { color: blue; font-weight: bold; text-align: center; margin-top: 20px; }
.error { color: red; background: #fee; padding: 10px; border-radius: 4px; }
`,
  },

  solution: {
    "/App.js": `import React from 'react';
import { useFetch } from "./hooks/useFetch";
import './styles.css';

export default function App() {
  const { data: products, loading, error } = useFetch(
    'https://fakestoreapi.com/products?limit=5'
  );

  if (loading) return <p className="loader">Loading...</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="container">
      <h1>FakeStore Products</h1>
      <div className="grid">
        {products.map((product) => (
          <div className="card" key={product.id}>
            <img src={product.image} alt={product.title} />
            <p>{product.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}`,

    "/hooks/useFetch.js": `import { useState, useEffect } from 'react';

export function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        setLoading(true);
        const res = await fetch(url);
        if (!res.ok) throw new Error('Request failed');
        const json = await res.json();
        if (!ignore) setData(json);
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [url]);

  return { data, loading, error };
}`,

    "/styles.css": `
.container { padding: 20px; font-family: sans-serif; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 20px; }
.card { border: 1px solid #ddd; padding: 10px; border-radius: 8px; text-align: center; }
.card img { height: 80px; object-fit: contain; }
.loader { color: blue; font-weight: bold; text-align: center; margin-top: 20px; }
.error { color: red; background: #fee; padding: 10px; border-radius: 4px; }
`,
  },

  checks: [
    staticCheck(
      "app-is-clean",
      "App.js has no useEffect or fetch",
      "App.js still knows too much. Move useEffect and fetch into hooks/useFetch.js.",
      (a) => a.hasFile(APP) && !a.hasCall("useEffect", APP) && !a.hasCall("fetch", APP),
    ),
    staticCheck(
      "app-uses-hook",
      "App.js calls useFetch(url)",
      "Call the Hook inside App and pass it the URL.",
      (a) => a.calls("useFetch", APP).some((c) => c.arguments.length >= 1),
    ),
    staticCheck(
      "hook-takes-url",
      "The hook receives the URL as a parameter",
      "Change the signature to useFetch(url) and use it in the fetch.",
      (a) => (a.declaredFunction("useFetch", HOOK)?.params.length ?? 0) >= 1,
    ),
    staticCheck(
      "hook-has-state",
      "The hook owns data, loading and error",
      "Declare the three useState calls inside the Hook.",
      (a) => {
        const names = a.stateHooks(HOOK).map((h) => h.state);
        return ["data", "loading", "error"].every((n) => names.includes(n));
      },
    ),
    staticCheck(
      "hook-has-effect",
      "The hook fetches inside useEffect",
      "Put the fetch inside a useEffect in useFetch.js.",
      (a) =>
        a.calls("useEffect", HOOK).some((c) => containsCall(c, "fetch")),
    ),
    staticCheck(
      "hook-returns-object",
      "The hook returns { data, loading, error }",
      "Return an object with the three values from useFetch.",
      (a) => {
        const fn = a.declaredFunction("useFetch", HOOK);
        if (!fn) return false;
        return (fn.body.body as AstNode[]).some(
          (s) =>
            s.type === "ReturnStatement" &&
            s.argument?.type === "ObjectExpression" &&
            ["data", "loading", "error"].every((k) =>
              (s.argument.properties as AstNode[]).some((p) => keyName(p) === k),
            ),
        );
      },
    ),
    staticCheck(
      "hook-handles-errors",
      "The hook handles failures (try/catch and res.ok)",
      "Wrap the request in try/catch and throw when res.ok is false.",
      (a) =>
        a.has((n) => n.type === "TryStatement" && !!n.handler, HOOK) &&
        a.has((n) => n.type === "MemberExpression" && n.property?.name === "ok", HOOK),
    ),
    staticCheck(
      "url-in-dependencies",
      "The effect depends on [url]",
      "Add url to the dependency array so changing it refetches.",
      (a) =>
        a
          .calls("useEffect", HOOK)
          .some(
            (c) =>
              c.arguments[1]?.type === "ArrayExpression" && mentions(c.arguments[1], "url"),
          ),
    ),
    staticCheck(
      "no-hardcoded-url",
      "No hardcoded URL inside the hook",
      "The URL belongs to the caller. Use the parameter instead.",
      (a) =>
        a.hasFile(HOOK) &&
        !a.has(
          (n) =>
            n.type === "Literal" &&
            typeof n.value === "string" &&
            n.value.startsWith("http"),
          HOOK,
        ),
    ),
  ],

  mentorFocus:
    "Separation of concerns and Hook design. Comment on the API of the hook (what it returns and accepts) and its reusability.",

  estimatedTime: 20,
  tags: ["hooks", "refactor", "architecture", "reusability"],
};
