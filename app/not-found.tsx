import Link from "next/link";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { exercises } from "@/lib/exercises-registry";

export default function NotFound() {
  return (
    <>
      <SiteHeader total={exercises.length} />
      <main id="main" className="mx-auto max-w-[1360px] px-5 py-20 md:px-10">
        <p className="label text-muted">Error 404</p>
        <h1 className="display mt-4 text-[clamp(4.5rem,15vw,12rem)] leading-[0.85]">
          Missing rung<span className="text-accent">.</span>
        </h1>
        <p className="mt-8 max-w-md text-xl leading-snug text-muted">
          That exercise does not exist. It may have been renamed.
        </p>
        <Link
          href="/#exercises"
          className="mt-8 inline-flex h-[52px] items-center rounded-ui bg-accent px-6 font-semibold text-on-accent hover:brightness-95"
        >
          Browse the index →
        </Link>
      </main>
    </>
  );
}
