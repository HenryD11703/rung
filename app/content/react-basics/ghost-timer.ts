import type { Exercise } from "@/types";
import { type AstNode, containsCall, isFunction } from "@/lib/analysis";
import { hasFunctionalUpdate, staticCheck } from "../predicates";

const intervalEffects = (calls: AstNode[]) =>
  calls.filter(
    (c) => isFunction(c.arguments[0]) && containsCall(c.arguments[0], "setInterval"),
  );

export const ghostTimerExercise: Exercise = {
  slug: "effects-cleanup",
  title: "Effects: The Ghost Timer",
  difficulty: "medium",

  objective:
    "Manage the lifecycle of side effects and write cleanup functions so your app never leaks memory.",

  steps: [
    "Create a state for the seconds, starting at `0`.",
    "Write a `useEffect` that starts a `setInterval` ticking every 1000ms.",
    "Inside the interval, log `'Tick...'` so you can watch it in the console.",
    "Update the seconds with the functional form of the setter.",
    "Return a cleanup function that stops the interval when the component unmounts.",
  ],

  hints: [
    {
      question: "How do I keep a reference to the interval?",
      answer: `To clear an interval you first need its id:

const id = setInterval(() => { ... }, 1000);

// later: clearInterval(id);`,
    },
    {
      question: "Why does the log keep appearing after the component is gone?",
      answer:
        "That is the ghost. React removed the component from the screen, but the browser's `setInterval` is still alive because nobody told it to stop. It keeps using memory and CPU.",
    },
    {
      question: "What does the cleanup function look like?",
      answer: `Return an arrow function from the effect:

return () => {
  console.log("Cleaning up...");
  clearInterval(id);
};`,
    },
  ],

  theory: {
    title: "Effect lifecycle and cleanup",
    introduction:
      "When a component connects to the outside world (timers, subscriptions, listeners) that connection does not close by itself. If the component disappears but the connection stays open you get a **memory leak**, and the app slowly gets heavier.",
    goodPractices: [
      "Return a cleanup function from `useEffect` to release what the effect created.",
      "Use an empty dependency array `[]` when the effect should run once, on mount.",
      "Use the functional setter (`s => s + 1`) so the effect does not depend on the changing value.",
    ],
    badPractices: [
      "Forgetting cleanup: intervals and event listeners that outlive the component.",
      "Executing the cleanup immediately: `return clearInterval(id)` runs it now. You need `return () => clearInterval(id)`.",
      "Stacking timers: not cleaning up before a new effect starts when dependencies change.",
    ],
    examples: [
      "// Cleaning up an event listener\nuseEffect(() => {\n  window.addEventListener('scroll', handle);\n  return () => window.removeEventListener('scroll', handle);\n}, []);",
    ],
  },

  files: {
    "/App.js": `import React, { useState, useEffect } from 'react';

// THIS IS THE COMPONENT YOU HAVE TO FIX
function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    // Tip: const id = setInterval(...)

    // 1. Create your interval here

    // 2. RETURN a cleanup function: () => clearInterval(id)
  }, []);

  return (
    <div style={{ border: '2px solid #646cff', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
      <h2>Time: {seconds}s</h2>
      <p style={{ fontSize: '0.8rem', color: '#888' }}>Open the console to see the logs</p>
    </div>
  );
}

export default function App() {
  const [show, setShow] = useState(true);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>The Ghost Timer</h1>

      <button
        onClick={() => setShow(!show)}
        style={{
          background: show ? '#ff4444' : '#44ff44',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {show ? "Hide timer" : "Show timer"}
      </button>

      {show && <Timer />}
      {!show && <p style={{ marginTop: '20px' }}>Component unmounted. Is the log still running in the console?</p>}
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import React, { useState, useEffect } from 'react';

function Timer() {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      console.log('Tick...');
      setSeconds(s => s + 1);
    }, 1000);

    return () => {
      console.log('Cleaning up...');
      clearInterval(id);
    };
  }, []);

  return (
    <div style={{ border: '2px solid #646cff', padding: '20px', borderRadius: '8px', margin: '20px 0' }}>
      <h2>Time: {seconds}s</h2>
      <p style={{ fontSize: '0.8rem', color: '#888' }}>Open the console to see the logs</p>
    </div>
  );
}

export default function App() {
  const [show, setShow] = useState(true);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>The Ghost Timer</h1>

      <button
        onClick={() => setShow(!show)}
        style={{
          background: show ? '#ff4444' : '#44ff44',
          color: 'white',
          border: 'none',
          padding: '10px 20px',
          borderRadius: '5px',
          cursor: 'pointer'
        }}
      >
        {show ? "Hide timer" : "Show timer"}
      </button>

      {show && <Timer />}
      {!show && <p style={{ marginTop: '20px' }}>Component unmounted. Is the log still running in the console?</p>}
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "interval-in-effect",
      "Starts a setInterval inside useEffect",
      "Call setInterval from inside the useEffect callback.",
      (a) => intervalEffects(a.calls("useEffect")).length > 0,
    ),
    staticCheck(
      "interval-id-stored",
      "Keeps the interval id in a variable",
      "Save it: const id = setInterval(...). You need it to clear the interval.",
      (a) =>
        a.has(
          (n) =>
            n.type === "VariableDeclarator" &&
            n.init?.type === "CallExpression" &&
            n.init.callee?.name === "setInterval",
        ),
    ),
    staticCheck(
      "functional-update",
      "Updates the seconds with setSeconds(s => s + 1)",
      "Use the functional form so the interval never reads a stale value.",
      (a) => a.stateHooks().some((h) => hasFunctionalUpdate(a, h.setter)),
    ),
    staticCheck(
      "cleanup-returned",
      "The effect returns a cleanup function that calls clearInterval",
      "Return a function from the effect that calls clearInterval(id).",
      (a) =>
        intervalEffects(a.calls("useEffect")).some((effect) =>
          (effect.arguments[0].body.body ?? []).some(
            (s: AstNode) =>
              s.type === "ReturnStatement" &&
              isFunction(s.argument) &&
              containsCall(s.argument, "clearInterval"),
          ),
        ),
    ),
    staticCheck(
      "no-immediate-clear",
      "Does not run `return clearInterval(id)` immediately",
      "return clearInterval(id) executes right away. Return a function instead: return () => clearInterval(id).",
      (a) =>
        intervalEffects(a.calls("useEffect")).length > 0 &&
        !a.has(
          (n) =>
            n.type === "ReturnStatement" &&
            n.argument?.type === "CallExpression" &&
            n.argument.callee?.name === "clearInterval",
        ),
    ),
    staticCheck(
      "runs-once",
      "Uses an empty dependency array so the interval is created once",
      "Pass [] as the second argument of useEffect.",
      (a) =>
        intervalEffects(a.calls("useEffect")).some(
          (effect) =>
            effect.arguments[1]?.type === "ArrayExpression" &&
            effect.arguments[1].elements.length === 0,
        ),
    ),
  ],

  mentorFocus:
    "Effect cleanup and stale closures. Explain what leaks (or counts wrongly) when the failed checks are ignored.",

  estimatedTime: 15,
  tags: ["useEffect", "cleanup", "memory-leaks"],
};
