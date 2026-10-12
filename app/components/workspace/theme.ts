import type { SandpackTheme } from "@codesandbox/sandpack-react";

/** The editor lives on the same paper as the rest of the app. */
export const paperTheme: SandpackTheme = {
  colors: {
    surface1: "#f2f0eb",
    surface2: "#cfcbc1",
    surface3: "#e9e6de",
    clickable: "#4f4d48",
    base: "#111110",
    disabled: "#a7a39a",
    hover: "#111110",
    accent: "#c93a00",
    error: "#b3261e",
    errorSurface: "#fbe3dc",
  },
  syntax: {
    plain: "#111110",
    comment: { color: "#78756d", fontStyle: "italic" },
    keyword: { color: "#111110", fontWeight: "700" },
    tag: "#c93a00",
    punctuation: "#4f4d48",
    definition: "#111110",
    property: "#4f4d48",
    static: "#0b6b41",
    string: "#0b6b41",
  },
  font: {
    body: "var(--font-archivo), Arial, sans-serif",
    mono: "var(--font-plex-mono), ui-monospace, Menlo, monospace",
    size: "13px",
    lineHeight: "21px",
  },
};
