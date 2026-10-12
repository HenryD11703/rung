import type { Difficulty, Exercise } from "@/types";
import { counterExercise } from "@/content/react-basics/counter";
import { todoListExercise } from "@/content/react-basics/todo-list";
import { trafficLightExercise } from "@/content/react-basics/traffic-light";
import { liftingStateExercise } from "@/content/react-basics/lifting-state";
import { ghostTimerExercise } from "@/content/react-basics/ghost-timer";
import { fetchingExercise } from "@/content/react-basics/fetching";
import { customHooksExercise } from "@/content/react-basics/custom-hooks";
import { themeContextExercise } from "@/content/react-basics/theme-context";
import { formsExercise } from "@/content/react-basics/forms";
import { refsExercise } from "@/content/react-basics/refs";
import { performanceExercise } from "@/content/react-basics/performance";
import { reducerExercise } from "@/content/react-basics/reducer";

/** The order here is the order of the curriculum. */
export const exercises: Exercise[] = [
  // Easy
  counterExercise,
  todoListExercise,
  trafficLightExercise,
  liftingStateExercise,
  // Medium
  ghostTimerExercise,
  fetchingExercise,
  customHooksExercise,
  themeContextExercise,
  formsExercise,
  refsExercise,
  // Hard
  performanceExercise,
  reducerExercise,
];

export interface ExerciseSummary {
  slug: string;
  title: string;
  difficulty: Difficulty;
  estimatedTime: number;
  tags: string[];
  /** 1-based position in the curriculum. */
  number: number;
}

export function getExerciseBySlug(slug: string): Exercise | undefined {
  return exercises.find((ex) => ex.slug === slug);
}

export function getAllExercises(): ExerciseSummary[] {
  return exercises.map((ex, index) => ({
    slug: ex.slug,
    title: ex.title,
    difficulty: ex.difficulty,
    estimatedTime: ex.estimatedTime ?? 0,
    tags: ex.tags ?? [],
    number: index + 1,
  }));
}

export function getNeighbours(slug: string) {
  const index = exercises.findIndex((ex) => ex.slug === slug);
  return {
    previous: index > 0 ? exercises[index - 1] : undefined,
    next: index >= 0 && index < exercises.length - 1 ? exercises[index + 1] : undefined,
  };
}
