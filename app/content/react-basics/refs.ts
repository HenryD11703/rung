import type { Exercise } from "@/types";
import { type AstNode, isIdentifier, isLiteral } from "@/lib/analysis";
import { staticCheck } from "../predicates";

/** Names bound with `const x = useRef(...)`. */
const refNames = (nodes: AstNode[]) =>
  nodes
    .filter((n) => n.id.type === "Identifier")
    .map((n) => ({ name: n.id.name as string, init: n.init.arguments[0] as AstNode }));

const isCurrentOf = (node: AstNode | undefined, name: string) =>
  !!node &&
  node.type === "MemberExpression" &&
  node.property?.name === "current" &&
  isIdentifier(node.object, name);

export const refsExercise: Exercise = {
  slug: "useref-dom-and-persistence",
  title: "useRef: DOM Access & Persistence",
  difficulty: "medium",

  objective:
    "Use useRef to reach DOM elements directly and to keep values that survive renders without causing new ones.",

  steps: [
    "Create a ref with `useRef(null)` and attach it to the `<input>` with the `ref` attribute.",
    "Make the first button focus the input using the ref (`.focus()`).",
    "Create a second ref that starts at `0` to count clicks on the 'secret' button.",
    "Increase that count on every click without using `useState`.",
    "Report the count with an `alert` or `console.log`, not on screen.",
  ],

  hints: [
    {
      question: "How do I reach the real DOM element?",
      answer:
        "A ref is an object with a `.current` property. If your ref is `inputRef`, the HTML element is `inputRef.current`.",
    },
    {
      question: "How do I focus an input?",
      answer:
        "Inputs have a native `.focus()` method.\n\n`inputRef.current.focus();`",
    },
    {
      question: "State or ref?",
      answer:
        "If a change must show up on screen, use `useState`.\n\nIf you want to store a value silently, with no re-render, use `useRef`.",
    },
  ],

  theory: {
    title: "useRef: a persistent reference",
    introduction:
      "React is declarative: you describe what you want and React does it. Sometimes you need to be **imperative** and give direct orders, for example to focus an input, control a video or integrate a library that knows nothing about React.",
    goodPractices: [
      "Reach DOM elements to call their native methods (`.focus()`, `.scrollIntoView()`).",
      "Keep values that must survive renders but should not trigger one.",
      "Store timer ids or an 'is this the first render' flag.",
    ],
    badPractices: [
      "Changing the DOM by hand (`ref.current.innerText = 'Hi'`). That is the state's job.",
      "Reading `.current` during render. It may be out of sync. Use it in events or effects.",
      "Using a ref instead of state when the user needs to see the change.",
    ],
    examples: [
      "// Persistent value\nconst timerRef = useRef(null);",
      "// DOM access\n<video ref={videoRef} />",
    ],
  },

  files: {
    "/App.js": `import React, { useRef } from 'react';

export default function RefDemo() {
  // 1. Create a ref for the input

  // 2. Create a ref to count clicks (starts at 0)

  const focusInput = () => {
    // 3. Focus the input using the ref
  };

  const secretIncrement = () => {
    // 4. Increase the ref's count, but do not use useState
    // 5. Show an alert with the current value of .current
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Working with Refs</h1>

      <input
        placeholder="Type something here..."
        style={{ padding: '10px', marginBottom: '10px' }}
        // 6. Attach the ref here
      />

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={focusInput}>
          Focus input
        </button>

        <button onClick={secretIncrement}>
          Secret click (no re-render)
        </button>
      </div>

      <p style={{ marginTop: '20px', color: '#666' }}>
        Check the console: secret clicks do not trigger a render.
      </p>
      {console.log("Component rendered...")}
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import React, { useRef } from 'react';

export default function RefDemo() {
  const inputRef = useRef(null);
  const secretClicks = useRef(0);

  const focusInput = () => {
    inputRef.current.focus();
  };

  const secretIncrement = () => {
    secretClicks.current += 1;
    alert('Secret clicks: ' + secretClicks.current);
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Working with Refs</h1>

      <input
        ref={inputRef}
        placeholder="Type something here..."
        style={{ padding: '10px', marginBottom: '10px' }}
      />

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={focusInput}>
          Focus input
        </button>

        <button onClick={secretIncrement}>
          Secret click (no re-render)
        </button>
      </div>

      <p style={{ marginTop: '20px', color: '#666' }}>
        Check the console: secret clicks do not trigger a render.
      </p>
      {console.log("Component rendered...")}
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "input-ref-attached",
      "A useRef(null) is attached to the <input>",
      "Create const inputRef = useRef(null) and add ref={inputRef} to the input.",
      (a) => {
        const declarators = a.find(
          (n) =>
            n.type === "VariableDeclarator" &&
            n.init?.type === "CallExpression" &&
            n.init.callee?.name === "useRef",
        );
        return refNames(declarators).some(
          ({ name, init }) =>
            isLiteral(init, null) &&
            a.jsx("input").some((el) =>
              el.openingElement.attributes.some(
                (attr: AstNode) =>
                  attr.name?.name === "ref" &&
                  isIdentifier(attr.value?.expression, name),
              ),
            ),
        );
      },
    ),
    staticCheck(
      "focus-called",
      "Calls .focus() through the ref's .current",
      "Use inputRef.current.focus() in the button's handler.",
      (a) =>
        a.has(
          (n) =>
            n.type === "CallExpression" &&
            n.callee?.type === "MemberExpression" &&
            n.callee.property?.name === "focus" &&
            n.callee.object?.type === "MemberExpression" &&
            n.callee.object.property?.name === "current",
        ),
    ),
    staticCheck(
      "counter-ref",
      "A second ref starts at 0 to count clicks",
      "Create const secretClicks = useRef(0).",
      (a) => a.calls("useRef").some((c) => isLiteral(c.arguments[0], 0)),
    ),
    staticCheck(
      "no-state-for-counter",
      "The counter does not use useState",
      "The goal is to store the value without re-rendering. Do not use useState.",
      (a) => !a.hasCall("useState"),
    ),
    staticCheck(
      "increments-current",
      "Increments the counter's .current",
      "Increase it with secretClicks.current += 1 (or ++).",
      (a) => {
        const counters = refNames(
          a.find(
            (n) =>
              n.type === "VariableDeclarator" &&
              n.init?.type === "CallExpression" &&
              n.init.callee?.name === "useRef" &&
              isLiteral(n.init.arguments[0], 0),
          ),
        );
        return counters.some(({ name }) =>
          a.has(
            (n) =>
              (n.type === "UpdateExpression" && isCurrentOf(n.argument, name)) ||
              (n.type === "AssignmentExpression" && isCurrentOf(n.left, name)),
          ),
        );
      },
    ),
    staticCheck(
      "reports-value",
      "Reports the value with alert or console.log",
      "Show secretClicks.current in an alert() or console.log().",
      (a) => {
        const counters = refNames(
          a.find(
            (n) =>
              n.type === "VariableDeclarator" &&
              n.init?.type === "CallExpression" &&
              n.init.callee?.name === "useRef" &&
              isLiteral(n.init.arguments[0], 0),
          ),
        );
        return counters.some(({ name }) =>
          [...a.calls("alert"), ...a.calls("log")].some((call) =>
            (call.arguments as AstNode[]).some((arg) =>
              a.has((n) => isCurrentOf(n, name) && n.start >= arg.start && n.end <= arg.end),
            ),
          ),
        );
      },
    ),
  ],

  mentorFocus:
    "The state-vs-ref decision. Explain why a ref does not re-render and warn against reading .current during render.",

  estimatedTime: 15,
  tags: ["useRef", "dom", "focus", "performance"],
};
