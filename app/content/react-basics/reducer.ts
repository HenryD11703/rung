import type { Exercise } from "@/types";
import { runtimeCheck, staticCheck, usesMutatingMethod } from "../predicates";

const FILE = "App.js";

const KEEP_NAMES =
  " Keep the names `initialState` and `reducer` so the checks can find them.";

export const reducerExercise: Exercise = {
  slug: "usereducer-undo-redo",
  title: "useReducer: An Editor with Undo",
  difficulty: "hard",

  objective:
    "Build complex state logic with a reducer that tracks history (undo/redo), keeping all of it out of the UI.",

  steps: [
    "Model the state as `{ past, present, future }`.",
    "Handle `SET_TEXT`: push the current `present` into `past`, set the new `present`, and clear `future`.",
    "Handle `UNDO`: move `present` to the front of `future` and take the last item of `past` as the new `present`.",
    "Handle `REDO`: the reverse of `UNDO`.",
    "Return the same state when there is nothing to undo or redo.",
    "Never mutate: build new arrays and objects every time.",
  ],

  hints: [
    {
      question: "How do I move items between the history arrays?",
      answer: `For UNDO:
1. The new 'present' is the last element of 'past'.
2. The new 'past' is everything else: past.slice(0, -1).
3. 'future' receives the current present at the front: [present, ...future].`,
    },
    {
      question: "Why does my history fill with single letters?",
      answer:
        "Dispatching on every keystroke records every letter. A real app would debounce. For this exercise, just make sure each change really creates a new history entry and nothing else mutates.",
    },
    {
      question: "How do I avoid typos in action names?",
      answer:
        "Use constants: `const ACTIONS = { UNDO: 'UNDO', REDO: 'REDO', SET: 'SET_TEXT' };`",
    },
    {
      question: "How are my reducer's behaviours checked?",
      answer:
        "The checks run your `reducer` with real actions inside the browser. States are frozen, so any `push` or direct assignment will fail. That is on purpose: reducers must be pure.",
    },
  ],

  theory: {
    title: "State machines and useReducer",
    introduction:
      "When state depends on its previous value in complex ways (like an undo history), several `useState` calls become a nightmare. `useReducer` centralizes the logic in a pure function that is easy to test and reason about.",
    goodPractices: [
      "Reducer: receives the current state and an action, returns the next state.",
      "Dispatch: the component only announces *what happened*: `dispatch({ type: 'UNDO' })`.",
      "Extreme immutability: never `push()` or `pop()` in a reducer. Return new arrays and objects.",
    ],
    badPractices: [
      "Heavy logic in the component, such as history math inside `onClick`.",
      "Side effects inside the reducer. It must be a pure function: no fetch, no `Math.random()`.",
      "A fat reducer that holds unrelated data.",
    ],
    examples: [
      "// Dispatch an action\ndispatch({ type: 'SET_TEXT', payload: 'New text' });",
      "// Rich initial state\n{ past: [], present: '', future: [] }",
    ],
  },

  files: {
    "/App.js": `import React, { useReducer } from 'react';

// 1. Define your initial state here
const initialState = {
  past: [],
  present: '',
  future: []
};

// 2. Implement the reducer function
function reducer(state, action) {
  const { past, present, future } = state;

  switch (action.type) {
    case 'SET_TEXT':
      // Tip: save present into past before changing it
      return state;

    case 'UNDO':
      // Tip: the new present comes from past
      return state;

    case 'REDO':
      return state;

    default:
      return state;
  }
}

export default function EditorWithMemory() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Editor with History</h1>

      <textarea
        value={state.present}
        onChange={(e) => dispatch({ type: 'SET_TEXT', payload: e.target.value })}
        rows="5"
        style={{ width: '100%', padding: '10px', fontSize: '1.2rem', boxSizing: 'border-box' }}
      />

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.past.length === 0}
        >
          Undo
        </button>

        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={state.future.length === 0}
        >
          Redo
        </button>
      </div>

      <div style={{ marginTop: '20px', color: '#888', fontSize: '0.9rem' }}>
        <p>Changes in history: {state.past.length}</p>
        <p>Changes to redo: {state.future.length}</p>
      </div>
    </div>
  );
}`,
  },

  solution: {
    "/App.js": `import React, { useReducer } from 'react';

const initialState = {
  past: [],
  present: '',
  future: []
};

function reducer(state, action) {
  const { past, present, future } = state;

  switch (action.type) {
    case 'SET_TEXT':
      return {
        past: [...past, present],
        present: action.payload,
        future: []
      };

    case 'UNDO':
      if (past.length === 0) return state;
      return {
        past: past.slice(0, -1),
        present: past[past.length - 1],
        future: [present, ...future]
      };

    case 'REDO':
      if (future.length === 0) return state;
      return {
        past: [...past, present],
        present: future[0],
        future: future.slice(1)
      };

    default:
      return state;
  }
}

export default function EditorWithMemory() {
  const [state, dispatch] = useReducer(reducer, initialState);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', textAlign: 'center' }}>
      <h1>Editor with History</h1>

      <textarea
        value={state.present}
        onChange={(e) => dispatch({ type: 'SET_TEXT', payload: e.target.value })}
        rows="5"
        style={{ width: '100%', padding: '10px', fontSize: '1.2rem', boxSizing: 'border-box' }}
      />

      <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
        <button
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.past.length === 0}
        >
          Undo
        </button>

        <button
          onClick={() => dispatch({ type: 'REDO' })}
          disabled={state.future.length === 0}
        >
          Redo
        </button>
      </div>

      <div style={{ marginTop: '20px', color: '#888', fontSize: '0.9rem' }}>
        <p>Changes in history: {state.past.length}</p>
        <p>Changes to redo: {state.future.length}</p>
      </div>
    </div>
  );
}`,
  },

  checks: [
    runtimeCheck(
      "set-text-records-history",
      "SET_TEXT saves the previous value in `past`",
      "On SET_TEXT, add the current present to past, set the new present from action.payload and empty future." +
        KEEP_NAMES,
      FILE,
      `
      let s = __freeze(initialState);
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'a' }));
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'ab' }));
      return s.present === 'ab' && s.past.length === 2 &&
        s.past[s.past.length - 1] === 'a' && s.future.length === 0;
      `,
    ),
    runtimeCheck(
      "undo-moves-present-to-future",
      "UNDO restores the last past value and queues the present in `future`",
      "On UNDO, the new present is the last item of past, and the old present goes to the front of future.",
      FILE,
      `
      let s = __freeze(initialState);
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'a' }));
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'ab' }));
      s = __freeze(reducer(s, { type: 'UNDO' }));
      return s.present === 'a' && s.past.length === 1 &&
        s.future.length === 1 && s.future[0] === 'ab';
      `,
    ),
    runtimeCheck(
      "redo-restores",
      "REDO brings back the undone value",
      "On REDO, the new present is future[0], the old present goes back to past, and future loses its first item.",
      FILE,
      `
      let s = __freeze(initialState);
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'a' }));
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'ab' }));
      s = __freeze(reducer(s, { type: 'UNDO' }));
      s = __freeze(reducer(s, { type: 'REDO' }));
      return s.present === 'ab' && s.future.length === 0 && s.past.length === 2;
      `,
    ),
    runtimeCheck(
      "new-change-clears-future",
      "A new change after UNDO clears `future`",
      "When the user types after undoing, the old future is no longer valid. Reset it to [] in SET_TEXT.",
      FILE,
      `
      let s = __freeze(initialState);
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'a' }));
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'ab' }));
      s = __freeze(reducer(s, { type: 'UNDO' }));
      s = __freeze(reducer(s, { type: 'SET_TEXT', payload: 'x' }));
      return s.present === 'x' && s.future.length === 0;
      `,
    ),
    runtimeCheck(
      "empty-history-is-safe",
      "UNDO and REDO do nothing when there is no history",
      "Return the same state when past (for UNDO) or future (for REDO) is empty.",
      FILE,
      `
      const s = __freeze(initialState);
      const u = reducer(s, { type: 'UNDO' });
      const r = reducer(s, { type: 'REDO' });
      return u.present === s.present && u.past.length === 0 &&
        r.present === s.present && r.future.length === 0;
      `,
    ),
    staticCheck(
      "no-mutating-methods",
      "The reducer never mutates (no push, pop, splice...)",
      "Build new arrays with the spread operator or slice instead of mutating them.",
      (a) => !usesMutatingMethod(a),
    ),
  ],

  mentorFocus:
    "Reducer purity and state-shape design. Mention action-type constants and how a reducer is trivially unit-testable.",

  estimatedTime: 30,
  tags: ["useReducer", "state-machine", "undo-redo", "advanced-logic"],
};
