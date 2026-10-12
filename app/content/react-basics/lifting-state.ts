import type { Exercise } from "@/types";
import {
  type AstNode,
  containsCall,
  hasNode,
  mentions,
} from "@/lib/analysis";
import { paramNames, staticCheck } from "../predicates";

export const liftingStateExercise: Exercise = {
  slug: "lifting-state",
  title: "Lifting State Up: The Mirror",
  difficulty: "easy",

  objective:
    "Share data between sibling components by moving state to their closest common ancestor, so the UI always stays in sync.",

  steps: [
    "Notice that `InputComponent` and `DisplayComponent` are siblings and cannot pass data to each other directly.",
    "Move the state and its setter from `InputComponent` up to `App`.",
    "Pass the value to `DisplayComponent` as a prop.",
    "Pass the update function to `InputComponent` so it can change the parent's state.",
    "Type in the input and check that the other component updates in real time.",
  ],

  hints: [
    {
      question: "Why can't a child send data to its sibling?",
      answer:
        "React data flow is **one-way** (top to bottom). Siblings have no direct connection, so the data goes up to the parent and comes back down to the other sibling.",
    },
    {
      question: "How do I pass a function as a prop?",
      answer: `Exactly like any other prop:

<InputComponent onChange={setText} />

Inside the child, call it from the event:
<input onChange={(e) => props.onChange(e.target.value)} />`,
    },
    {
      question: "What should I name the props?",
      answer:
        "A common convention is `on...` for functions going down (`onTextChange`) and the plain noun for data (`text`).",
    },
  ],

  theory: {
    title: "Sharing data: lifting state up",
    introduction:
      "Often several components must reflect the same changing data. If each keeps its own copy the UI drifts out of sync. **Lifting state up** gives you a single source of truth.",
    goodPractices: [
      "Find the closest common ancestor of every component that needs the data.",
      "Pass setter functions down so children can report changes.",
      "Destructure props in the child to keep it readable.",
    ],
    badPractices: [
      "Duplicating state in each sibling. One updates and the other does not.",
      "Reading another component's value with `document.getElementById`. Never do that in React.",
      "Lifting too high. If only two small components use the value, do not hoist it to the root of the app.",
    ],
    examples: [
      "// Passing the setter\n<Input onUpdate={(v) => setValue(v)} />",
      "// Receiving the prop\nconst Display = ({ text }) => <p>{text}</p>;",
    ],
  },

  files: {
    "/App.js": `import React, { useState } from 'react';

// 1. Move the state here so both children can access it
export default function App() {
  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Text Synchronizer</h1>
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <InputComponent />
        <hr />
        <DisplayComponent />
      </div>
    </div>
  );
}

function InputComponent() {
  // Remove the state from here
  const [value, setValue] = useState("");

  return (
    <div>
      <label>Type something: </label>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
    </div>
  );
}

function DisplayComponent() {
  // 2. This component should receive the text through props
  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Live result:</h3>
      <p style={{ color: 'blue', fontSize: '1.5rem' }}>
        {/* Show the text here */}
        ...
      </p>
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import React, { useState } from 'react';

export default function App() {
  const [text, setText] = useState("");

  return (
    <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'sans-serif' }}>
      <h1>Text Synchronizer</h1>
      <div style={{ border: '1px solid #ddd', padding: '20px', borderRadius: '8px' }}>
        <InputComponent value={text} onChange={setText} />
        <hr />
        <DisplayComponent text={text} />
      </div>
    </div>
  );
}

function InputComponent({ value, onChange }) {
  return (
    <div>
      <label>Type something: </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function DisplayComponent({ text }) {
  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Live result:</h3>
      <p style={{ color: 'blue', fontSize: '1.5rem' }}>
        {text}
      </p>
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "state-lives-in-app",
      "App owns the state",
      "Move the useState call into the App component.",
      (a) => {
        const app = a.declaredFunction("App");
        return !!app && containsCall(app, "useState");
      },
    ),
    staticCheck(
      "input-has-no-state",
      "InputComponent has no state of its own",
      "Remove useState from InputComponent. It should be controlled by App.",
      (a) => {
        const input = a.declaredFunction("InputComponent");
        return !!input && !containsCall(input, "useState");
      },
    ),
    staticCheck(
      "input-receives-props",
      "InputComponent receives the value and the update function",
      "Pass props to <InputComponent /> and read them in its parameters.",
      (a) =>
        paramNames(a.declaredFunction("InputComponent")).length > 0 &&
        a
          .jsx("InputComponent")
          .some((el) => el.openingElement.attributes.length >= 1),
    ),
    staticCheck(
      "display-receives-state",
      "DisplayComponent receives the state as a prop",
      "Pass the state value to <DisplayComponent /> as a prop.",
      (a) => {
        const state = a.declaredFunction("App") ? a.stateHooks()[0]?.state : undefined;
        return (
          !!state &&
          paramNames(a.declaredFunction("DisplayComponent")).length > 0 &&
          a
            .jsx("DisplayComponent")
            .some((el) => mentions(el.openingElement, state))
        );
      },
    ),
    staticCheck(
      "display-renders-prop",
      "DisplayComponent renders the received text",
      "Show the prop inside the paragraph with curly braces.",
      (a) => {
        const display = a.declaredFunction("DisplayComponent");
        if (!display) return false;
        const names = paramNames(display);
        const usesProps =
          display.params[0]?.type === "Identifier" &&
          hasNode(
            display.body,
            (n: AstNode) =>
              n.type === "MemberExpression" &&
              n.object?.name === display.params[0].name,
          );
        return (
          usesProps ||
          names.some((name) =>
            hasNode(
              display.body,
              (n: AstNode) =>
                n.type === "JSXExpressionContainer" && mentions(n, name),
            ),
          )
        );
      },
    ),
    staticCheck(
      "no-dom-queries",
      "Does not read the DOM directly",
      "Do not use document.getElementById or querySelector. Share data through state and props.",
      (a) =>
        !!a.declaredFunction("App") &&
        containsCall(a.declaredFunction("App")!, "useState") &&
        !a.hasCall("getElementById") &&
        !a.hasCall("querySelector") &&
        !a.hasCall("querySelectorAll"),
    ),
  ],

  mentorFocus:
    "Unidirectional data flow and choosing the right owner for state. Mention naming of callback props.",

  estimatedTime: 10,
  tags: ["lifting-state", "props", "synchronization", "basic-patterns"],
};
