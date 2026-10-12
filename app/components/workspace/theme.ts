import type { SandpackTheme } from "@codesandbox/sandpack-react";

/** Editor, tabs and console share the app's dark canvas. */
export const signalTheme: SandpackTheme = {
  colors: {
    surface1: "#131315",
    surface2: "#2a2a2e",
    surface3: "#1a1a1d",
    clickable: "#9a9aa0",
    base: "#f3f3f0",
    disabled: "#5b5b61",
    hover: "#f3f3f0",
    accent: "#dfff3f",
    error: "#ff6b5e",
    errorSurface: "#2a1613",
  },
  syntax: {
    plain: "#f3f3f0",
    comment: { color: "#7a7a82", fontStyle: "italic" },
    keyword: { color: "#dfff3f", fontWeight: "500" },
    tag: "#ff9b8a",
    punctuation: "#9a9aa0",
    definition: "#f3f3f0",
    property: "#c9c9ce",
    static: "#7fe0b8",
    string: "#7fe0b8",
  },
  font: {
    body: "var(--font-inter), Arial, sans-serif",
    mono: "var(--font-jetbrains), ui-monospace, Menlo, monospace",
    size: "13px",
    lineHeight: "21px",
  },
};
