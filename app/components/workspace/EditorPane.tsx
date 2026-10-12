"use client";

import { useEffect, useState } from "react";
import { SandpackCodeEditor, SandpackLayout, useSandpack } from "@codesandbox/sandpack-react";
import type { Exercise } from "@/types";
import { cn } from "@/lib/cn";

export function EditorPane({
  exercise,
  onReveal,
}: {
  exercise: Exercise;
  onReveal: () => void;
}) {
  const { sandpack } = useSandpack();
  const [confirming, setConfirming] = useState(false);
  const multiFile = Object.keys(exercise.files).length > 1;

  // Revealing is a two-step action; it disarms itself after a few seconds.
  useEffect(() => {
    if (!confirming) return;
    const timer = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(timer);
  }, [confirming]);

  const reveal = () => {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    for (const [path, code] of Object.entries(exercise.solution)) {
      sandpack.updateFile(path, code);
    }
    onReveal();
    setConfirming(false);
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-ink px-3">
        <span className="label text-ink-2">Editor</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              sandpack.resetAllFiles();
              setConfirming(false);
            }}
            className="label min-h-9 px-3 hover:bg-paper-2"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={reveal}
            aria-label={confirming ? "Confirm: reveal the solution" : "Reveal the solution"}
            className={cn(
              "label min-h-9 border border-ink px-3 transition-colors",
              confirming ? "on-ink bg-accent text-ink" : "hover:bg-paper-2",
            )}
          >
            {confirming ? "Sure? Reveal" : "Solution"}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
          <SandpackCodeEditor
            showTabs={multiFile}
            showLineNumbers
            showInlineErrors
            wrapContent
            style={{ height: "100%", flex: 1 }}
          />
        </SandpackLayout>
      </div>
    </div>
  );
}
