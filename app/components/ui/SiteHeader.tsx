import Link from "next/link";
import { Brand } from "./Brand";
import { ProgressBadge } from "./ProgressBadge";

export const REPO_URL = "https://github.com/HenryD11703/rung";

export function SiteHeader({ total }: { total: number }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between px-5 md:px-10">
        <Brand />
        <nav aria-label="Primary" className="flex items-center gap-5 sm:gap-7">
          <Link href="/#how" className="hidden text-sm text-muted transition-colors hover:text-fg sm:inline">
            How it works
          </Link>
          <Link href="/#exercises" className="hidden text-sm text-muted transition-colors hover:text-fg sm:inline">
            Exercises
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted transition-colors hover:text-fg"
          >
            Source ↗
          </a>
          <ProgressBadge total={total} />
        </nav>
      </div>
    </header>
  );
}
