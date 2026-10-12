import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { exercises } from "@/lib/exercises-registry";

export default function NotFound() {
  return (
    <>
      <SiteHeader total={exercises.length} />
      <main id="main" className="mx-auto max-w-[1400px] px-5 py-20 md:px-8">
        <p className="label text-ink-2">Error 404</p>
        <h1 className="display mt-4 text-[clamp(4rem,14vw,11rem)] leading-[0.85]">
          Not here<span className="text-accent">.</span>
        </h1>
        <p className="mt-8 max-w-md text-xl leading-snug">
          That exercise does not exist. It may have been renamed.
        </p>
        <Link
          href="/#exercises"
          className="on-ink mt-8 inline-flex h-14 items-center bg-ink px-6 font-semibold text-paper hover:bg-accent hover:text-ink"
        >
          Browse the index →
        </Link>
      </main>
    </>
  );
}
