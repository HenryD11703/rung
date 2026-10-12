import type { Exercise } from "@/types";
import {
  type AstNode,
  calleeName,
  hasNode,
  isFunction,
  mentions,
  nodesOf,
} from "@/lib/analysis";
import {
  hasFunctionalUpdate,
  staticCheck,
  usesMutatingMethod,
} from "../predicates";

/** `.map(callback)` calls whose callback returns JSX. */
const jsxMaps = (calls: AstNode[]) =>
  calls.filter(
    (c) =>
      isFunction(c.arguments[0]) &&
      hasNode(c.arguments[0], (n) => n.type === "JSXElement"),
  );

export const todoListExercise: Exercise = {
  slug: "lists-and-keys",
  title: "Lists & Keys: Rendering Arrays",
  difficulty: "easy",

  objective:
    "Turn an array of data into UI with .map(), and remove items without mutating the state.",

  steps: [
    "Use `.map()` to return JSX for every task in the array.",
    "Give each element a stable `key` taken from the task's `id`.",
    "Add a delete button to every task.",
    "Implement `removeTask` so it filters the array by `id`.",
    "Update the state with the functional form (`prev => ...`).",
  ],

  hints: [
    {
      question: "How do I use .map() inside the return?",
      answer: `Wrap it in curly braces:
{tasks.map((task) => (
  <div key={task.id}>
    {task.text}
  </div>
))}`,
    },
    {
      question: "What is the safest way to remove an item?",
      answer: `Use .filter() to build a new array without the item:
const next = tasks.filter(t => t.id !== idToRemove);

Even better, use the functional form so you always start from the latest state:
setTasks(prev => prev.filter(...));`,
    },
    {
      question: "Why does React need a key?",
      answer:
        "React compares the old and new list to decide what to update. A stable key lets it match each item to the same DOM node, even after the list is reordered or an item is removed.",
    },
  ],

  theory: {
    title: "Rendering lists and the power of keys",
    introduction:
      "Almost every screen is a list of something: messages, products, tasks. React needs a cheap way to know which item changed, moved or disappeared without redrawing the whole list.",
    goodPractices: [
      "Use `.map()` to turn data into elements.",
      "Use stable keys such as database ids or UUIDs.",
      "Stay immutable: `.filter()`, `.map()` and spread return new arrays instead of changing the old one.",
    ],
    badPractices: [
      "Using the array index as the key. When the list reorders or an item is removed, indexes shift and React can mix up component state.",
      "Mutating state with `push()`, `pop()` or `splice()`.",
      "Generating keys with `Math.random()` during render. Every render creates new keys, so the entire list is destroyed and rebuilt.",
    ],
    examples: [
      "// Remove with filter\nsetItems(prev => prev.filter(i => i.id !== targetId));",
      "// Recommended item shape\n{ id: crypto.randomUUID(), text: 'Task' }",
    ],
  },

  files: {
    "/App.js": `import React, { useState } from 'react';

export default function TodoList() {
  // Tip: start with a few sample tasks
  const [tasks, setTasks] = useState([
    { id: 1, text: "Learn .map()" },
    { id: 2, text: "Understand keys" }
  ]);

  const removeTask = (id) => {
    // Tip: use .filter() and keep it immutable
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px' }}>
      <h1>My Todo List</h1>
      <div style={{ marginTop: '20px' }}>
        {/* Render your tasks here */}
        {/* Every task needs a delete button */}
      </div>
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import { useState } from 'react';

export default function TodoList() {
  const [tasks, setTasks] = useState([
    { id: 1, text: "Learn .map()" },
    { id: 2, text: "Understand keys" }
  ]);

  const removeTask = (id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', maxWidth: '500px' }}>
      <h1>My Todo List</h1>
      <div style={{ marginTop: '20px' }}>
        {tasks.map((task) => (
          <div key={task.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
            <span>{task.text}</span>
            <button onClick={() => removeTask(task.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}`,
  },

  checks: [
    staticCheck(
      "renders-with-map",
      "Renders the tasks with .map()",
      "Call tasks.map(...) and return JSX for each task.",
      (a) => jsxMaps(a.calls("map")).length > 0,
    ),
    staticCheck(
      "key-from-id",
      "Each item has a stable key taken from its id",
      "Use key={task.id}. Do not use the index or Math.random().",
      (a) => {
        const maps = jsxMaps(a.calls("map"));
        if (maps.length === 0) return false;
        return maps.every((call) => {
          const callback = call.arguments[0];
          const indexParam = callback.params[1]?.name as string | undefined;
          const keys = nodesOf(
            callback,
            (n) => n.type === "JSXAttribute" && n.name?.name === "key",
          );
          if (keys.length === 0) return false;
          return keys.every((attr) => {
            const expr = attr.value?.expression;
            if (!expr || expr.type !== "MemberExpression") return false;
            if (expr.property?.name !== "id") return false;
            if (indexParam && mentions(expr, indexParam)) return false;
            return !hasNode(
              expr,
              (n) => n.type === "CallExpression" && calleeName(n) === "random",
            );
          });
        });
      },
    ),
    staticCheck(
      "delete-button-per-item",
      "Every task has a delete button with an onClick",
      "Add a <button onClick={...}> inside the element returned by .map().",
      (a) =>
        jsxMaps(a.calls("map")).some((call) =>
          hasNode(
            call.arguments[0],
            (n) =>
              n.type === "JSXElement" &&
              n.openingElement.name.name === "button" &&
              n.openingElement.attributes.some(
                (attr: AstNode) => attr.name?.name === "onClick",
              ),
          ),
        ),
    ),
    staticCheck(
      "remove-uses-filter",
      "Removes a task with .filter()",
      "Pass tasks.filter(task => task.id !== id) to the setter.",
      (a) =>
        a.stateHooks().some((h) =>
          a.calls(h.setter).some((c) =>
            hasNode(c, (n) => n.type === "CallExpression" && calleeName(n) === "filter"),
          ),
        ),
    ),
    staticCheck(
      "functional-update",
      "Uses the functional form: setTasks(prev => ...)",
      "Pass a function to the setter: setTasks(prev => prev.filter(...)).",
      (a) => a.stateHooks().some((h) => hasFunctionalUpdate(a, h.setter)),
    ),
    staticCheck(
      "no-mutation",
      "Does not mutate the array (no push, splice, pop...)",
      "Never call push, pop, splice, shift, unshift, sort or reverse on state.",
      (a) =>
        a.stateHooks().some((h) => a.hasCall(h.setter)) && !usesMutatingMethod(a),
    ),
  ],

  mentorFocus:
    "Immutable updates and stable keys. If keys or mutation are wrong, explain what actually breaks in the UI.",

  estimatedTime: 12,
  tags: ["arrays", "map", "keys", "immutability"],
};
