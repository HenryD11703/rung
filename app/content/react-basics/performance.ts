import type { Exercise } from "@/types";
import { type AstNode, containsCall, isFunction, mentions } from "@/lib/analysis";
import { hasConsoleLog, staticCheck } from "../predicates";

export const performanceExercise: Exercise = {
  slug: "performance-memoization",
  title: "Performance: The Slow List",
  difficulty: "hard",

  objective:
    "Fix a laggy list by finding unnecessary re-renders and removing them with React.memo, useMemo and useCallback.",

  steps: [
    "Find the bottleneck: type in the input and watch the console. The whole list renders on every keystroke.",
    "Extract the list item into a component called `ListItem`.",
    "Wrap `ListItem` in `React.memo` so it only re-renders when its props change.",
    "Memoize the filtering with `useMemo` so it only runs when the search term changes.",
    "Write `handleSelect` with `useCallback` so its reference stays stable between renders.",
    "Remove any `console.log` you added before you finish.",
  ],

  hints: [
    {
      question: "How do I know a component is re-rendering?",
      answer:
        "Put a `console.log('Rendering item')` inside it. If typing one letter prints hundreds of lines, you have a performance problem.",
    },
    {
      question: "Why doesn't React.memo work when I pass a function?",
      answer: `Functions are recreated on every render. An inline function makes React think the prop changed, so memo never skips.

Memoize it:
const handleClick = useCallback(() => { ... }, []);`,
    },
    {
      question: "When should I use useMemo?",
      answer:
        "For expensive calculations, like filtering 500+ items.\n\n`const result = useMemo(() => list.filter(...), [dependencies]);`",
    },
    {
      question: "Which import style should I use?",
      answer:
        "Import what you need directly:\n`import { memo, useMemo, useCallback } from 'react';`",
    },
  ],

  theory: {
    title: "Optimization and memoization in React",
    introduction:
      "By default, when a component's state changes React re-renders **all** of its children. In a 500-item list that is 500 pointless renders per keystroke, which means lag and a poor experience.",
    goodPractices: [
      "`React.memo` skips a render when props are equal to the previous ones.",
      "`useMemo` caches the **result** of a calculation (a value or a filtered array).",
      "`useCallback` caches a **function** so its reference stays stable.",
    ],
    badPractices: [
      "Premature optimization: do not memoize everything 'just in case'. It has a cost. Measure first.",
      "Inline functions as props: `onClick={() => doSomething()}` breaks `React.memo` because the function is new on every render.",
      "Wrong dependencies: using a value in `useCallback` without listing it makes the function read a stale value.",
    ],
    examples: [
      "// Memoize a calculation\nconst total = useMemo(() => slowCalc(data), [data]);",
      "// Memoize a component\nexport default memo(MyComponent);",
    ],
  },

  files: {
    "/App.js": `import React, { useState, useMemo, useCallback } from 'react';
import './styles.css';

// Imagine this list comes from a heavy API
const slowItems = Array.from({ length: 500 }, (_, i) => "Item " + i);

// 1. Create the ListItem component here and wrap it in React.memo

export default function App() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  // 2. Optimize this filtering with useMemo
  const filtered = slowItems.filter(item =>
    item.toLowerCase().includes(search.toLowerCase())
  );

  // 3. Create handleSelect with useCallback
  const handleSelect = (item) => {
    setSelected(item);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>High-Performance List</h1>
      <p>Selected: {selected || 'None'}</p>

      <input
        type="text"
        placeholder="Type fast to feel the lag..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <ul>
        {filtered.map(item => (
          <li key={item}>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}`,

    "/styles.css": `
input { padding: 12px; width: 100%; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
ul { max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px; list-style: none; }
li { padding: 8px; border-bottom: 1px solid #fafafa; cursor: pointer; }
li:hover { background: #f0f0f0; }
`,
  },

  solution: {
    "/App.js": `import React, { useState, useMemo, useCallback, memo } from 'react';
import './styles.css';

const slowItems = Array.from({ length: 500 }, (_, i) => "Item " + i);

const ListItem = memo(function ListItem({ item, onSelect }) {
  return <li onClick={() => onSelect(item)}>{item}</li>;
});

export default function App() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);

  const filtered = useMemo(
    () =>
      slowItems.filter(item =>
        item.toLowerCase().includes(search.toLowerCase())
      ),
    [search]
  );

  const handleSelect = useCallback((item) => {
    setSelected(item);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>High-Performance List</h1>
      <p>Selected: {selected || 'None'}</p>

      <input
        type="text"
        placeholder="Type fast to feel the lag..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <ul>
        {filtered.map(item => (
          <ListItem key={item} item={item} onSelect={handleSelect} />
        ))}
      </ul>
    </div>
  );
}`,

    "/styles.css": `
input { padding: 12px; width: 100%; margin-bottom: 20px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
ul { max-height: 300px; overflow-y: auto; border: 1px solid #eee; padding: 10px; list-style: none; }
li { padding: 8px; border-bottom: 1px solid #fafafa; cursor: pointer; }
li:hover { background: #f0f0f0; }
`,
  },

  checks: [
    staticCheck(
      "list-item-component",
      "The item lives in its own ListItem component",
      "Create a ListItem component and render it inside the .map().",
      (a) => !!a.declaredFunction("ListItem") && a.jsx("ListItem").length > 0,
    ),
    staticCheck(
      "wrapped-in-memo",
      "ListItem is wrapped in memo()",
      "Wrap the component: const ListItem = memo(function ListItem(...) { ... }).",
      (a) => a.hasCall("memo"),
    ),
    staticCheck(
      "memoized-filter",
      "The filtering runs inside useMemo with [search]",
      "Wrap the filter in useMemo and list search as its dependency.",
      (a) =>
        a
          .calls("useMemo")
          .some(
            (c) =>
              isFunction(c.arguments[0]) &&
              containsCall(c.arguments[0], "filter") &&
              c.arguments[1]?.type === "ArrayExpression" &&
              mentions(c.arguments[1], "search"),
          ),
    ),
    staticCheck(
      "stable-handler",
      "handleSelect is created with useCallback",
      "Wrap handleSelect in useCallback so its reference does not change.",
      (a) =>
        a
          .calls("useCallback")
          .some(
            (c) =>
              isFunction(c.arguments[0]) &&
              containsCall(c.arguments[0], "setSelected") &&
              c.arguments[1]?.type === "ArrayExpression",
          ),
    ),
    staticCheck(
      "no-inline-function-props",
      "ListItem receives no inline functions as props",
      "Pass the memoized handleSelect, not an arrow function written in the JSX.",
      (a) => {
        const items = a.jsx("ListItem");
        return (
          items.length > 0 &&
          items.every((el) =>
            el.openingElement.attributes.every(
              (attr: AstNode) =>
                !attr.value?.expression || !isFunction(attr.value.expression),
            ),
          )
        );
      },
    ),
    staticCheck(
      "no-leftover-logs",
      "No console.log left in the final code",
      "Remove the console.log calls you used for debugging.",
      (a) => !hasConsoleLog(a),
    ),
  ],

  mentorFocus:
    "When memoization actually helps and when it is wasted effort. Check that dependency arrays are honest and mention measuring with the React Profiler.",

  estimatedTime: 25,
  tags: ["performance", "memoization", "useMemo", "useCallback"],
};
