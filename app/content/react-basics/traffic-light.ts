import type { Exercise } from "@/types";
import {
  type AstNode,
  type CodeAnalysis,
  hasNode,
  isIdentifier,
  isLiteral,
  jsxAttributeValue,
  keyName,
} from "@/lib/analysis";
import { staticCheck } from "../predicates";

const STATUSES = ["success", "error", "loading"];

const hasConfig = (a: CodeAnalysis) =>
  a
    .find((n) => n.type === "ObjectExpression")
    .some((obj) => {
      const keys = (obj.properties as AstNode[]).map(keyName);
      return STATUSES.every((s) => keys.includes(s));
    });

export const trafficLightExercise: Exercise = {
  slug: "conditional-rendering",
  title: "Conditional Rendering: The Traffic Light",
  difficulty: "easy",

  objective:
    "Show different UI depending on state, using clean techniques: a lookup object, ternaries and the && shortcut.",

  steps: [
    "Create a state called `status`, initialised to `'loading'`.",
    "Define a config object outside the return that maps each status (`success`, `error`, `loading`) to a color, an icon and a message.",
    "Make the container's background use the color of the current status.",
    "Render the icon and the message by reading from your config object.",
    "Wire the three buttons so each one sets the matching status.",
  ],

  hints: [
    {
      question: "How should I define the config object?",
      answer: `A lookup table keeps the JSX free of branching:
const CONFIGS = {
  success: { color: '#2ecc71', icon: '✅', text: 'All good!' },
  error: { color: '#e74c3c', icon: '❌', text: 'Something went wrong' },
  loading: { color: '#f1c40f', icon: '⏳', text: 'Loading...' }
};`,
    },
    {
      question: "How do I read from the object dynamically?",
      answer: `If your state is called 'status', use bracket notation:

const current = CONFIGS[status];
// then: current.color, current.icon, current.text`,
    },
    {
      question: "What if I only want to show something in one case?",
      answer: `Use the && operator:
{status === 'loading' && <Spinner />}

The right side renders only when the left side is truthy.`,
    },
  ],

  theory: {
    title: "Clean conditional rendering",
    introduction:
      "Real interfaces are never static: you need a loading message while data arrives, or an error when something fails. Conditional rendering makes your UI a *function of your state*.",
    goodPractices: [
      "Ternary (`? :`): ideal when choosing between two options, like Login vs Logout.",
      "Short-circuit (`&&`): perfect for 'show this or nothing'.",
      "Lookup objects: the cleanest option once you have three or more states.",
    ],
    badPractices: [
      "`if/else` inside the JSX: JSX only accepts expressions, not statements.",
      "Nested ternaries: `a ? (b ? x : y) : z` is hard to read and harder to change.",
      "Heavy logic inside the return: compute values above the return and just render the result.",
    ],
    examples: [
      "// && operator\n{isAdmin && <AdminPanel />}",
      "// Ternary\n{isLogged ? <UserMenu /> : <LoginBtn />}",
      "// Dynamic access\nconst icon = ICONS[status];",
    ],
  },

  files: {
    "/App.js": `import React, { useState } from 'react';

export default function TrafficLight() {
  // 1. Create the 'status' state (starts as 'loading')

  // 2. Define your CONFIGS object

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>System Status</h1>

      {/* 3. The container background must change with the status */}
      <div style={{
        padding: '30px',
        borderRadius: '12px',
        marginTop: '20px',
        transition: 'all 0.3s ease'
      }}>
        {/* 4. Show the icon and the message here */}
      </div>

      {/* 5. Wire the buttons so they change the status */}
      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button>Success</button>
        <button>Error</button>
        <button>Loading</button>
      </div>
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import { useState } from 'react';

const CONFIGS = {
  success: { color: '#2ecc71', icon: '✅', text: 'All good!' },
  error: { color: '#e74c3c', icon: '❌', text: 'Something went wrong' },
  loading: { color: '#f1c40f', icon: '⏳', text: 'Loading...' },
};

export default function TrafficLight() {
  const [status, setStatus] = useState('loading');
  const current = CONFIGS[status];

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>System Status</h1>

      <div style={{
        padding: '30px',
        borderRadius: '12px',
        marginTop: '20px',
        transition: 'all 0.3s ease',
        background: current.color
      }}>
        <div style={{ fontSize: '3rem' }}>{current.icon}</div>
        <p>{current.text}</p>
      </div>

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button onClick={() => setStatus('success')}>Success</button>
        <button onClick={() => setStatus('error')}>Error</button>
        <button onClick={() => setStatus('loading')}>Loading</button>
      </div>
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "status-state",
      "Has a `status` state that starts as 'loading'",
      "Use const [status, setStatus] = useState('loading').",
      (a) =>
        a.stateHooks().some((h) => h.state === "status" && isLiteral(h.init, "loading")),
    ),
    staticCheck(
      "config-object",
      "Defines a config object with success, error and loading",
      "Create an object with the keys success, error and loading, each with color, icon and text.",
      hasConfig,
    ),
    staticCheck(
      "lookup-by-status",
      "Reads the config with CONFIGS[status]",
      "Use bracket notation with the state: CONFIGS[status].",
      (a) =>
        a.has(
          (n) =>
            n.type === "MemberExpression" &&
            n.computed &&
            isIdentifier(n.property, "status"),
        ),
    ),
    staticCheck(
      "no-branch-chains",
      "No switch, if/else chains or nested ternaries",
      "Let the lookup object do the work instead of chaining conditions.",
      (a) =>
        hasConfig(a) &&
        !a.has(
          (n) =>
            n.type === "SwitchStatement" ||
            (n.type === "IfStatement" && n.alternate?.type === "IfStatement") ||
            (n.type === "ConditionalExpression" &&
              (n.consequent.type === "ConditionalExpression" ||
                n.alternate.type === "ConditionalExpression")),
        ),
    ),
    staticCheck(
      "dynamic-background",
      "The container's background is dynamic",
      "Set background (or backgroundColor) in the style from the current config, not a fixed string.",
      (a) =>
        a.allJsx().some((el) => {
          const style = jsxAttributeValue(el, "style");
          if (!style || style.type !== "ObjectExpression") return false;
          return (style.properties as AstNode[]).some(
            (p) =>
              ["background", "backgroundColor"].includes(keyName(p) ?? "") &&
              p.value.type !== "Literal",
          );
        }),
    ),
    staticCheck(
      "buttons-set-status",
      "Each button sets success, error or loading",
      "Call setStatus('success'), setStatus('error') and setStatus('loading') from the three buttons.",
      (a) => {
        const setter = a.stateHooks().find((h) => h.state === "status")?.setter;
        if (!setter) return false;
        const calls = a.calls(setter);
        return STATUSES.every((s) =>
          calls.some((c) => hasNode(c.arguments[0] ?? c, (n) => isLiteral(n, s))),
        );
      },
    ),
  ],

  mentorFocus:
    "Replacing branching with a lookup object. Mention readability and how easy it becomes to add a fourth status.",

  estimatedTime: 12,
  tags: ["conditional-rendering", "objects", "dynamic-styles"],
};
