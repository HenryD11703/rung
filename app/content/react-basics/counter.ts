import type { Exercise } from "@/types";
import { isLiteral, isIdentifier, mentions } from "@/lib/analysis";
import { addsOne, handlerOf, staticCheck } from "../predicates";

export const counterExercise: Exercise = {
  slug: "state-counter",
  title: "State: Build a Counter",
  difficulty: "easy",

  objective:
    "Use the useState Hook so a component can remember a value and update the screen when it changes.",

  steps: [
    "Import the `useState` Hook directly from `react`.",
    "Declare a state variable initialised to `0`.",
    "Render the current value inside the `<h1>`.",
    "Make the button add `1` to the counter when clicked.",
  ],

  hints: [
    {
      question: "How do I import the Hook cleanly?",
      answer:
        "Import it by name so you never have to write `React.` in front of it:\n\n`import { useState } from 'react';`",
    },
    {
      question: "I don't understand the array destructuring",
      answer:
        "The shape is `const [value, setValue] = useState(initial);`.\n\nThink of `value` as a photo of the current state and `setValue` as the remote that takes a new photo.",
    },
    {
      question: "Why can't I just write count++?",
      answer:
        "State is read-only. Changing the variable does not tell React anything happened, so the screen never updates. Call the setter instead: `setCount(count + 1)`.",
    },
  ],

  theory: {
    title: "The heart of React: useState",
    introduction:
      'In a plain function, local variables disappear when the function returns. **State** is memory that React keeps for your component between renders, so it does not "forget" what the user did.',
    goodPractices: [
      "Named import: `import { useState } from 'react'` keeps the code short and readable.",
      "Sensible initial value: a counter starts at `0`.",
      "Always go through the setter: calling it is what schedules a new render.",
    ],
    badPractices: [
      "Mutating state directly (`count++`, `count = count + 1`). React will not notice.",
      "Reaching for `React.useState` when a named import is available.",
      "Calling Hooks inside conditions or loops. They must run in the same order on every render.",
    ],
    examples: [
      "// Declare state\nconst [score, setScore] = useState(0);",
      "// Update it from an event\n<button onClick={() => setScore(score + 1)}>Point!</button>",
    ],
  },

  files: {
    "/App.js": `import React from 'react';
// Tip: import useState up here

export default function Counter() {
  // 1. Create your state here

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Count: { /* 2. Show the state here */ }</h1>

      {/* 3. Wire the button with an onClick handler */}
      <button>Increment</button>
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Count: {count}</h1>
      <button onClick={() => setCount(count + 1)}>Increment</button>
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "named-import",
      "Imports { useState } from 'react'",
      "Import the Hook by name: import { useState } from 'react'.",
      (a) => a.hasNamedImport("react", "useState"),
    ),
    staticCheck(
      "no-react-namespace",
      "Calls useState directly, not React.useState",
      "Use the named import instead of React.useState.",
      (a) => !a.usesNamespaceCall("React", "useState"),
    ),
    staticCheck(
      "state-starts-at-zero",
      "Declares a state variable initialised to 0",
      "Use const [count, setCount] = useState(0).",
      (a) => a.stateHooks().some((h) => isLiteral(h.init, 0)),
    ),
    staticCheck(
      "renders-state",
      "Shows the state value inside the <h1>",
      "Put the state variable inside curly braces in the <h1>.",
      (a) =>
        a.stateHooks().some((h) => a.jsx("h1").some((el) => mentions(el, h.state))),
    ),
    staticCheck(
      "button-updates-state",
      "The button's onClick calls the setter",
      "Give the button an onClick that calls your setter function.",
      (a) =>
        a.stateHooks().some((h) =>
          a.jsx("button").some((button) => {
            const handler = handlerOf(a, button, "onClick");
            return !!handler && mentions(handler, h.setter);
          }),
        ),
    ),
    staticCheck(
      "adds-one",
      "Increases the value by exactly 1",
      "Pass count + 1 (or prev => prev + 1) to the setter.",
      (a) =>
        a.stateHooks().some((h) => a.calls(h.setter).some((c) => addsOne(c.arguments[0]))),
    ),
    staticCheck(
      "no-direct-mutation",
      "Never mutates the state variable",
      "Do not use count++ or count = count + 1. Call the setter.",
      (a) =>
        !a.stateHooks().some((h) =>
          a.has(
            (n) =>
              (n.type === "UpdateExpression" && isIdentifier(n.argument, h.state)) ||
              (n.type === "AssignmentExpression" && isIdentifier(n.left, h.state)),
          ),
        ),
    ),
  ],

  mentorFocus:
    "Beginner exercise on useState. Explain only what the failed checks point to and keep the tone encouraging.",

  estimatedTime: 10,
  tags: ["hooks", "useState", "beginner"],
};
