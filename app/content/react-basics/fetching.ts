import type { Exercise } from "@/types";
import {
  type AstNode,
  containsCall,
  hasNode,
  isFunction,
  isLiteral,
} from "@/lib/analysis";
import {
  findOutsideCall,
  isRenderedOutsideEffects,
  staticCheck,
} from "../predicates";

export const fetchingExercise: Exercise = {
  slug: "robust-data-fetching",
  title: "Robust Data Fetching",
  difficulty: "medium",

  objective:
    "Fetch data from an API with useEffect and async/await, handling the three states every request has: loading, error and success.",

  steps: [
    "Declare three states: `data`, `loading` (boolean) and `error`.",
    "Create an async function inside `useEffect` that calls `fetch`.",
    "Wrap it in `try/catch/finally` to handle network and API failures.",
    "Throw when the response is not ok, because `fetch` does not do it for you.",
    "Render each state: a loading message, the error message, or the list of results.",
  ],

  hints: [
    {
      question: "Why is my error state always null?",
      answer: `fetch only rejects on network failures. A 404 or 500 still resolves, so check it yourself:

if (!res.ok) throw new Error("We could not load the data");`,
    },
    {
      question: "What is the 'finally' block for?",
      answer:
        "`finally` runs whether the request succeeded or failed. It is the right place for `setLoading(false)` so you write it once.",
    },
    {
      question: "How do I render the data safely?",
      answer: `Make sure it exists before mapping:
{data && data.map(item => <li key={item.id}>{item.name}</li>)}`,
    },
    {
      question: "Can I make the effect callback itself async?",
      answer:
        "No. An async function returns a Promise, but React expects the effect to return nothing or a cleanup function. Declare an async function inside the effect and call it.",
    },
  ],

  theory: {
    title: "The professional fetching pattern",
    introduction:
      "On the web, things fail: the connection is slow, the server is down, the API changes. If your code does not handle those cases the app freezes or shows a blank screen, and the user has no idea why.",
    goodPractices: [
      "async/await reads like synchronous code.",
      "try/catch/finally captures errors and turns off the loading state in one place.",
      "Check `res.ok` so HTTP errors are treated as errors.",
    ],
    badPractices: [
      "Ignoring the error state. If the API fails the user never finds out.",
      "Fetching in the render body, which triggers a request on every render.",
      "Forgetting the dependency array. Without `[]` the effect runs after every render.",
    ],
    examples: [
      "// Triple conditional render\nif (loading) return <p>Loading...</p>;\nif (error) return <p>Error: {error}</p>;\nreturn <ul>{data.map(i => <li key={i.id}>{i.name}</li>)}</ul>",
    ],
  },

  files: {
    "/App.js": `import React, { useState, useEffect } from 'react';

export default function RobustFetching() {
  // 1. Declare your 3 states here: data, loading and error

  useEffect(() => {
    // 2. Create your async function for the fetch
    // Suggested API: https://rickandmortyapi.com/api/character

  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Rick & Morty Characters</h1>

      {/* 3. Conditional rendering:
        - If loading is true, show a loading message.
        - If there is an error, show it in red.
        - If there is data, use .map() to show the names.
      */}
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import { useState, useEffect } from 'react';

export default function RobustFetching() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('https://rickandmortyapi.com/api/character');
        if (!res.ok) throw new Error('We could not load the data');
        const json = await res.json();
        setData(json.results);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) return <p style={{ padding: '20px' }}>Loading...</p>;
  if (error) return <p style={{ padding: '20px', color: 'red' }}>{error}</p>;

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Rick & Morty Characters</h1>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {data.map((character) => (
          <li key={character.id}>{character.name}</li>
        ))}
      </ul>
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "three-states",
      "Declares data, loading and error states",
      "Create three useState calls named data, loading and error.",
      (a) => {
        const names = a.stateHooks().map((h) => h.state);
        return ["data", "loading", "error"].every((n) => names.includes(n));
      },
    ),
    staticCheck(
      "fetch-in-effect",
      "Calls fetch inside useEffect",
      "Move the fetch call inside the useEffect callback.",
      (a) =>
        a
          .calls("useEffect")
          .some((c) => isFunction(c.arguments[0]) && containsCall(c.arguments[0], "fetch")),
    ),
    staticCheck(
      "runs-once",
      "useEffect has an empty dependency array",
      "Pass [] as the second argument so the request runs once on mount.",
      (a) =>
        a
          .calls("useEffect")
          .some(
            (c) =>
              c.arguments[1]?.type === "ArrayExpression" &&
              c.arguments[1].elements.length === 0,
          ),
    ),
    staticCheck(
      "async-await-try-catch",
      "Uses async/await inside a try/catch",
      "Declare an async function, await the fetch and wrap it in try/catch.",
      (a) =>
        a.has(
          (n) =>
            isFunction(n) &&
            !!n.async &&
            hasNode(n, (m) => m.type === "AwaitExpression") &&
            hasNode(n, (m) => m.type === "TryStatement" && !!m.handler),
        ),
    ),
    staticCheck(
      "checks-res-ok",
      "Treats a non-ok response as an error (res.ok + throw)",
      "fetch does not throw on 404/500. Check res.ok and throw an Error yourself.",
      (a) =>
        a.has((n) => n.type === "MemberExpression" && n.property?.name === "ok") &&
        a.has((n) => n.type === "ThrowStatement"),
    ),
    staticCheck(
      "finally-turns-off-loading",
      "Turns loading off inside `finally`",
      "Call setLoading(false) in a finally block so it runs on success and failure.",
      (a) => {
        const setter = a.stateHooks().find((h) => h.state === "loading")?.setter;
        if (!setter) return false;
        return a.has(
          (n) =>
            n.type === "TryStatement" &&
            !!n.finalizer &&
            hasNode(
              n.finalizer,
              (m) =>
                m.type === "CallExpression" &&
                m.callee?.name === setter &&
                isLiteral(m.arguments[0], false),
            ),
        );
      },
    ),
    staticCheck(
      "renders-loading",
      "Renders the loading state",
      "Use `loading` to decide what to render (if, &&, or a ternary).",
      (a) => isRenderedOutsideEffects(a, "loading"),
    ),
    staticCheck(
      "renders-error",
      "Shows the error to the user",
      "Store the message in state and render it. The user cannot read the console.",
      (a) => isRenderedOutsideEffects(a, "error"),
    ),
    staticCheck(
      "renders-list",
      "Renders the results with .map()",
      "Call data.map(...) and return an element for each item.",
      (a) =>
        findOutsideCall(
          a,
          "useEffect",
          (n: AstNode) =>
            n.type === "CallExpression" &&
            n.callee?.property?.name === "map" &&
            isFunction(n.arguments[0]) &&
            hasNode(n.arguments[0], (m) => m.type === "JSXElement"),
        ).length > 0,
    ),
  ],

  mentorFocus:
    "Async error handling and the loading/error/success trio. Mention race conditions (ignoring stale responses) only if everything already passes.",

  estimatedTime: 15,
  tags: ["fetching", "async-await", "useEffect", "error-handling"],
};
