import type { Exercise } from "@/types";
import {
  type AstNode,
  hasNode,
  jsxAttribute,
  jsxName,
  keyName,
  mentions,
} from "@/lib/analysis";
import { staticCheck } from "../predicates";

const FIELDS = ["name", "email", "role"];

export const formsExercise: Exercise = {
  slug: "controlled-forms",
  title: "Forms: The Single Source of Truth",
  difficulty: "medium",

  objective:
    "Manage several inputs with one state object and turn plain inputs into controlled components.",

  steps: [
    "Keep a single state called `formData`, an object with `name`, `email` and `role`.",
    "Bind the `value` of every field (inputs and the select) to the matching key of `formData`.",
    "Write one generic `handleChange` that uses the input's `name` attribute.",
    "Update the state immutably with the spread operator.",
    "Stop the browser from reloading the page on submit with `e.preventDefault()`.",
  ],

  hints: [
    {
      question: "How do I handle several inputs with one function?",
      answer: `Use computed property names:

const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData(prev => ({
    ...prev,
    [name]: value // name matches the key in your state object
  }));
};`,
    },
    {
      question: "Why can't I type in my input?",
      answer:
        "If you bind `value` but forget `onChange`, the input becomes read-only. React needs you to say how the value should change.",
    },
    {
      question: "Why do I need the spread operator?",
      answer:
        "`setFormData({ name: value })` would erase `email` and `role`. `...prev` copies the current values and then overrides only the one that changed.",
    },
    {
      question: "What about the 'name' attribute?",
      answer:
        "The HTML `name` must match the key in your state exactly (for example `name='email'` for the `email` key).",
    },
  ],

  theory: {
    title: "Controlled vs. uncontrolled components",
    introduction:
      "In traditional HTML the DOM stores the input's value. In React we want **state to be the single source of truth**. That lets you validate instantly, format text as the user types and disable the submit button while data is missing.",
    goodPractices: [
      "One state object for related fields, instead of ten separate `useState` calls.",
      "One generic handler driven by the `name` attribute.",
      "Controlled inputs: `value` always comes from state.",
    ],
    badPractices: [
      "One handler per field (`handleName`, `handleEmail`...). The code grows with every field.",
      "Mutating state: `formData.name = 'John'`. State is read-only until you call the setter.",
      "Forgetting `preventDefault`. The page reloads and the React state is lost.",
    ],
    examples: [
      "// Prevent reload\nconst handleSubmit = (e) => { e.preventDefault(); console.log(form); };",
      "// Controlled input\n<input name='email' value={form.email} onChange={handleChange} />",
    ],
  },

  files: {
    "/App.js": `import React, { useState } from 'react';

export default function RegistrationForm() {
  // 1. Keep one state object with name, email and role
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'developer'
  });

  const handleChange = (e) => {
    // 2. Implement the generic logic here
  };

  const handleSubmit = (e) => {
    // 3. Prevent the page reload, then show the data
    alert("Submitted: " + JSON.stringify(formData));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px' }}>
      <h1>User Registration</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            style={{ width: '100%' }}
            // 4. Bind value and onChange
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            style={{ width: '100%' }}
            // 5. Bind value and onChange
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Role:</label>
          <select name="role" style={{ width: '100%' }}>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>
          Register
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666' }}>
        <strong>State preview:</strong>
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </div>
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import React, { useState } from 'react';

export default function RegistrationForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'developer'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    alert("Submitted: " + JSON.stringify(formData));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '400px' }}>
      <h1>User Registration</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '10px' }}>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <label>Role:</label>
          <select
            name="role"
            value={formData.role}
            onChange={handleChange}
            style={{ width: '100%' }}
          >
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <button type="submit" style={{ width: '100%', padding: '10px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>
          Register
        </button>
      </form>

      <div style={{ marginTop: '20px', fontSize: '0.8rem', color: '#666' }}>
        <strong>State preview:</strong>
        <pre>{JSON.stringify(formData, null, 2)}</pre>
      </div>
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "single-state-object",
      "One state object holds name, email and role",
      "Use a single useState with an object that has the keys name, email and role.",
      (a) => {
        const hooks = a.stateHooks();
        return (
          hooks.length === 1 &&
          hooks[0].init?.type === "ObjectExpression" &&
          FIELDS.every((f) =>
            (hooks[0].init!.properties as AstNode[]).some((p) => keyName(p) === f),
          )
        );
      },
    ),
    staticCheck(
      "fields-are-controlled",
      "Input, input and select all bind `value` to state",
      "Add value={formData.xxx} to the two inputs and to the select.",
      (a) => {
        const state = a.stateHooks()[0]?.state;
        const fields = a
          .allJsx()
          .filter((el) => ["input", "select"].includes(jsxName(el)));
        return (
          !!state &&
          fields.length >= 3 &&
          fields.every((el) => {
            const value = jsxAttribute(el, "value");
            return !!value && mentions(value, state);
          })
        );
      },
    ),
    staticCheck(
      "fields-have-onchange",
      "Every field has an onChange handler",
      "Add onChange={handleChange} to the inputs and to the select.",
      (a) => {
        const fields = a
          .allJsx()
          .filter((el) => ["input", "select"].includes(jsxName(el)));
        return fields.length >= 3 && fields.every((el) => !!jsxAttribute(el, "onChange"));
      },
    ),
    staticCheck(
      "generic-handler",
      "One handler uses a computed key: [name]: value",
      "Read name and value from e.target and update with [name]: value.",
      (a) => a.has((n) => n.type === "Property" && n.computed === true),
    ),
    staticCheck(
      "spread-update",
      "Updates state immutably with the spread operator",
      "Copy the previous values first: { ...prev, [name]: value }.",
      (a) => {
        const setter = a.stateHooks()[0]?.setter;
        if (!setter) return false;
        return a
          .calls(setter)
          .some((c) => hasNode(c, (n) => n.type === "SpreadElement"));
      },
    ),
    staticCheck(
      "prevent-default",
      "Calls e.preventDefault() on submit",
      "Call e.preventDefault() at the start of handleSubmit.",
      (a) => a.hasCall("preventDefault"),
    ),
  ],

  mentorFocus:
    "Controlled components and immutable updates of an object. Mention validation and accessibility (labels) only after the checks pass.",

  estimatedTime: 15,
  tags: ["forms", "state", "controlled-components", "events"],
};
