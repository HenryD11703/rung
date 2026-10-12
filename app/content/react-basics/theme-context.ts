import type { Exercise } from "@/types";
import {
  type AstNode,
  containsCall,
  hasNode,
  isIdentifier,
  isLiteral,
  jsxAttributeValue,
  jsxName,
  keyName,
  mentions,
  resolveObject,
} from "@/lib/analysis";
import { staticCheck } from "../predicates";

const CONTEXT = "context/ThemeContext.js";
const APP = "App.js";
const NAVBAR = "components/Navbar.js";
const CONTENT = "components/Content.js";

const consumesContext = (call: AstNode | undefined) =>
  !!call && isIdentifier(call.arguments[0], "ThemeContext");

export const themeContextExercise: Exercise = {
  slug: "context-theme-switcher",
  title: "Context API: Theme Switcher",
  difficulty: "medium",

  objective:
    "Solve prop drilling with the Context API so global data, like a visual theme, is available anywhere without passing props by hand.",

  steps: [
    "Create and export a `ThemeContext` with `createContext()`.",
    "Implement `ThemeProvider` so it owns the theme state (`'light'` or `'dark'`) and a `toggleTheme` function.",
    "Pass both the theme and the toggle through the Provider's `value` prop.",
    "Wrap `Navbar` and `Content` in `App.js` with your `ThemeProvider`.",
    "Consume the context in `Navbar.js` and `Content.js` with `useContext`.",
  ],

  hints: [
    {
      question: "How do I create the context?",
      answer:
        "`createContext()` lives outside your components.\n\n`export const ThemeContext = createContext();`\n\nYou can pass a default value, but it is common to leave it empty and fill it in the Provider.",
    },
    {
      question: "What should I pass in the 'value' prop?",
      answer: `An object with everything the children need:

<ThemeContext.Provider value={{ theme, toggleTheme }}>
  {children}
</ThemeContext.Provider>`,
    },
    {
      question: "How do I know if I'm prop drilling?",
      answer:
        "If a component receives a prop only to pass it to its child, without using it, that is prop drilling. Context lets the child read the value directly.",
    },
    {
      question: "Why doesn't my button change the theme?",
      answer:
        "The component that calls `useContext` must be **inside** the `<ThemeProvider>`. Outside of it there is nothing to read.",
    },
  ],

  theory: {
    title: "Context API and the end of prop drilling",
    introduction:
      "As an app grows, passing data such as the logged-in user or the language through five or six levels of components becomes a maintenance nightmare. Context works like a broadcast: a Provider emits the data and any component below it can tune in.",
    goodPractices: [
      "Provider: the component that wraps others and emits the value.",
      "useContext: the Hook that reads what the nearest Provider emitted.",
      "Keep the state inside the Provider so any update refreshes every subscriber.",
    ],
    badPractices: [
      "Overusing Context. If only two sibling components need a value, props or lifting state are simpler.",
      "Keeping prop drilling for data that is clearly global, such as a theme.",
      "Putting huge, constantly changing objects in `value`: every consumer re-renders.",
    ],
    examples: [
      "// Create a context\nconst UserContext = createContext();",
      "// Consume it\nconst { user } = useContext(UserContext);",
      "// Provider shape\n<ThemeContext.Provider value={{ theme }}>{children}</ThemeContext.Provider>",
    ],
  },

  files: {
    "/App.js": `import React from 'react';
import Navbar from './components/Navbar';
import Content from './components/Content';
import { ThemeProvider } from './context/ThemeContext';
import './styles.css';

export default function App() {
  // Tip: wrap Navbar and Content with the right Provider
  return (
    <div className="app-container">
      <Navbar />
      <Content />
    </div>
  );
}`,

    "/context/ThemeContext.js": `import React, { createContext, useState } from 'react';

// 1. Create and export the context
export const ThemeContext = null;

export function ThemeProvider({ children }) {
  // 2. Define the 'theme' state ('light' by default)

  // 3. Define toggleTheme to switch between 'light' and 'dark'

  return (
    // 4. Wrap {children} with the Provider and pass the value
    <>{children}</>
  );
}`,

    "/components/Navbar.js": `import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function Navbar() {
  // 1. Get toggleTheme from the context

  return (
    <nav className="navbar">
      <h1>My App</h1>
      <button onClick={() => { /* 2. Call it here */ }}>
        Toggle theme
      </button>
    </nav>
  );
}`,

    "/components/Content.js": `import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function Content() {
  // 1. Get the current 'theme' from the context
  const theme = 'light';

  return (
    <main className={\`content \${theme}-mode\`}>
      <h2>Main content</h2>
      <p>This block changes color thanks to Context.</p>
    </main>
  );
}`,

    "/styles.css": `
.app-container { font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
.navbar { padding: 1rem; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
.content { flex: 1; padding: 2rem; transition: all 0.3s ease; }
.light-mode { background-color: #ffffff; color: #333; }
.dark-mode { background-color: #1a1a1a; color: #fff; }
button { padding: 8px 16px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; }
`,
  },

  solution: {
    "/App.js": `import React from 'react';
import Navbar from './components/Navbar';
import Content from './components/Content';
import { ThemeProvider } from './context/ThemeContext';
import './styles.css';

export default function App() {
  return (
    <ThemeProvider>
      <div className="app-container">
        <Navbar />
        <Content />
      </div>
    </ThemeProvider>
  );
}`,

    "/context/ThemeContext.js": `import React, { createContext, useState } from 'react';

export const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('light');

  const toggleTheme = () => {
    setTheme((current) => (current === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}`,

    "/components/Navbar.js": `import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function Navbar() {
  const { toggleTheme } = useContext(ThemeContext);

  return (
    <nav className="navbar">
      <h1>My App</h1>
      <button onClick={toggleTheme}>Toggle theme</button>
    </nav>
  );
}`,

    "/components/Content.js": `import React, { useContext } from 'react';
import { ThemeContext } from '../context/ThemeContext';

export default function Content() {
  const { theme } = useContext(ThemeContext);

  return (
    <main className={\`content \${theme}-mode\`}>
      <h2>Main content</h2>
      <p>This block changes color thanks to Context.</p>
    </main>
  );
}`,

    "/styles.css": `
.app-container { font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; }
.navbar { padding: 1rem; border-bottom: 1px solid #ccc; display: flex; justify-content: space-between; align-items: center; }
.content { flex: 1; padding: 2rem; transition: all 0.3s ease; }
.light-mode { background-color: #ffffff; color: #333; }
.dark-mode { background-color: #1a1a1a; color: #fff; }
button { padding: 8px 16px; cursor: pointer; border-radius: 4px; border: 1px solid #ccc; }
`,
  },

  checks: [
    staticCheck(
      "context-created",
      "ThemeContext is created with createContext()",
      "Export a ThemeContext created with createContext().",
      (a) =>
        a.has(
          (n) =>
            n.type === "VariableDeclarator" &&
            isIdentifier(n.id, "ThemeContext") &&
            n.init?.type === "CallExpression" &&
            n.init.callee?.name === "createContext",
          CONTEXT,
        ),
    ),
    staticCheck(
      "provider-state",
      "ThemeProvider keeps the theme in state, starting as 'light'",
      "Use const [theme, setTheme] = useState('light') inside ThemeProvider.",
      (a) => a.stateHooks(CONTEXT).some((h) => isLiteral(h.init, "light")),
    ),
    staticCheck(
      "toggle-defined",
      "toggleTheme updates the state",
      "Define toggleTheme so it calls setTheme to switch between light and dark.",
      (a) => {
        const fn = a.declaredFunction("toggleTheme", CONTEXT);
        const setter = a.stateHooks(CONTEXT)[0]?.setter;
        return !!fn && !!setter && containsCall(fn, setter);
      },
    ),
    staticCheck(
      "provider-value",
      "The Provider's value contains { theme, toggleTheme }",
      "Pass value={{ theme, toggleTheme }} to ThemeContext.Provider.",
      (a) =>
        a.jsx("ThemeContext.Provider", CONTEXT).some((el) => {
          const object = resolveObject(a, jsxAttributeValue(el, "value"));
          const keys = ((object?.properties ?? []) as AstNode[]).map(keyName);
          return keys.includes("theme") && keys.includes("toggleTheme");
        }),
    ),
    staticCheck(
      "app-wraps-children",
      "App wraps Navbar and Content with <ThemeProvider>",
      "Wrap both components with <ThemeProvider> in App.js.",
      (a) =>
        a.jsx("ThemeProvider", APP).some(
          (el) =>
            hasNode(el, (n) => n.type === "JSXElement" && jsxName(n) === "Navbar") &&
            hasNode(el, (n) => n.type === "JSXElement" && jsxName(n) === "Content"),
        ),
    ),
    staticCheck(
      "no-prop-drilling",
      "Navbar and Content receive no props from App",
      "Remove the props. Context makes them unnecessary.",
      (a) =>
        ["Navbar", "Content"].every((name) => {
          const elements = a.jsx(name, APP);
          return (
            elements.length > 0 &&
            elements.every((el) => el.openingElement.attributes.length === 0)
          );
        }),
    ),
    staticCheck(
      "navbar-toggles",
      "Navbar reads the context and calls toggleTheme from the button",
      "Get toggleTheme with useContext(ThemeContext) and use it in the button's onClick.",
      (a) =>
        a.calls("useContext", NAVBAR).some(consumesContext) &&
        a.jsx("button", NAVBAR).some((button) => {
          const handler = jsxAttributeValue(button, "onClick");
          return !!handler && mentions(handler, "toggleTheme");
        }),
    ),
    staticCheck(
      "content-reads-theme",
      "Content gets the theme from the context",
      "Replace the hardcoded theme with const { theme } = useContext(ThemeContext).",
      (a) =>
        a.has(
          (n) =>
            n.type === "VariableDeclarator" &&
            n.id.type === "ObjectPattern" &&
            n.id.properties.some((p: AstNode) => keyName(p) === "theme") &&
            n.init?.type === "CallExpression" &&
            n.init.callee?.name === "useContext" &&
            consumesContext(n.init),
          CONTENT,
        ),
    ),
  ],

  mentorFocus:
    "Context design: what belongs in context, how the value object affects re-renders, and whether prop drilling is gone.",

  estimatedTime: 20,
  tags: ["context-api", "hooks", "global-state", "architecture"],
};
