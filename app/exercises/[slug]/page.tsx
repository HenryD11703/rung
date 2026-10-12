import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { exercises, getExerciseBySlug } from "@/lib/exercises-registry";
import Workspace from "@/components/workspace/Workspace";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return exercises.map((exercise) => ({ slug: exercise.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const exercise = getExerciseBySlug(slug);
  return exercise
    ? { title: exercise.title, description: exercise.objective }
    : { title: "Not found" };
}

export default async function ExercisePage({ params }: PageProps) {
  const { slug } = await params;
  if (!getExerciseBySlug(slug)) notFound();
  return <Workspace slug={slug} />;
}
