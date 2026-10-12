"use client";

import { useState } from "react";
import { SandpackConsole, SandpackLayout, SandpackPreview } from "@codesandbox/sandpack-react";
import { cn } from "@/lib/cn";

type View = "preview" | "console";

export function PreviewPane() {
  const [view, setView] = useState<View>("preview");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Output" className="flex h-11 shrink-0 items-stretch border-b border-ink">
        {(["preview", "console"] as const).map((id) => (
          <button
            key={id}
            role="tab"
            aria-selected={view === id}
            onClick={() => setView(id)}
            className={cn(
              "label min-w-24 px-4 transition-colors",
              view === id ? "bg-ink text-paper" : "hover:bg-paper-2",
            )}
          >
            {id === "preview" ? "Preview" : "Console"}
          </button>
        ))}
      </div>

      {/* Both stay mounted so the console keeps its history. */}
      <div className="relative min-h-0 flex-1">
        <div className={cn("absolute inset-0", view !== "preview" && "invisible")}>
          <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
            <SandpackPreview
              showNavigator={false}
              showOpenInCodeSandbox={false}
              showRefreshButton
              style={{ height: "100%", flex: 1 }}
            />
          </SandpackLayout>
        </div>
        <div className={cn("absolute inset-0", view !== "console" && "invisible")}>
          <SandpackLayout style={{ height: "100%", border: "none", borderRadius: 0 }}>
            <SandpackConsole resetOnPreviewRestart style={{ height: "100%", flex: 1 }} />
          </SandpackLayout>
        </div>
      </div>
    </div>
  );
}
