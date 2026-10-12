"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} className="text-accent underline underline-offset-2" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  pre: ({ children }) => (
    <pre className="mb-3 overflow-x-auto rounded-ui border border-line bg-raised-2 p-3 font-mono text-[12px] leading-5 [&_code]:!bg-transparent [&_code]:!p-0 [&_code]:!text-[1em]">
      {children}
    </pre>
  ),
  code: ({ node, children, ...props }) => {
    void node;
    return (
      <code className="rounded-[3px] bg-raised-2 px-1 py-px font-mono text-[0.86em] text-fg" {...props}>
        {children}
      </code>
    );
  },
};

export function Markdown({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
