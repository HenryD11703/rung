import { Brand } from "./Brand";
import { ProgressBadge } from "./ProgressBadge";

export const REPO_URL = "https://github.com/HenryD11703/learn_react_j2m";

export function SiteHeader({ total }: { total: number }) {
  return (
    <header className="border-b-2 border-ink">
      <div className="mx-auto flex h-14 max-w-[1400px] items-center justify-between px-5 md:px-8">
        <Brand />
        <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-8">
          <a href="#exercises" className="label hidden hover:underline sm:inline">
            Exercises
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="label hover:underline"
          >
            Source ↗
          </a>
          <ProgressBadge total={total} />
        </nav>
      </div>
    </header>
  );
}
