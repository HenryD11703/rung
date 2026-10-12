import { expect, test as base, type Page } from "@playwright/test";
import { getExerciseBySlug } from "../../app/lib/exercises-registry";

/**
 * Every test starts with the review API *blocked*. Real model calls must never
 * happen in tests; individual tests opt in with their own `page.route`.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route("**/api/review", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "upstream_error", message: "Unmocked API call in a test." },
        }),
      }),
    );
    await use(page);
  },
});

export { expect };

export const isMobile = (projectName: string) => projectName === "mobile";

/** On phones the panes are tabs; on desktop everything is visible already. */
export async function openPane(page: Page, projectName: string, pane: "Brief" | "Code" | "Preview" | "Checks") {
  if (!isMobile(projectName)) return;
  await page
    .getByRole("navigation", { name: "Workspace sections" })
    .getByRole("button", { name: new RegExp(`^${pane}`) })
    .click();
}

export const runChecks = (page: Page) => page.getByRole("button", { name: /Run checks/ }).click();

/** A line that exists in the solution but not in the starter. */
function solutionSnippet(slug: string): string {
  const exercise = getExerciseBySlug(slug)!;
  const [path] = Object.keys(exercise.solution);
  const starter = exercise.files[path];
  const line = exercise.solution[path]
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 12 && !starter.includes(l));
  if (!line) throw new Error(`No distinctive solution line for ${slug}`);
  return line;
}

export async function revealSolution(page: Page, projectName: string, slug: string) {
  await openPane(page, projectName, "Code");
  await page.getByRole("button", { name: "Reveal the solution" }).click();
  await page.getByRole("button", { name: "Confirm: reveal the solution" }).click();
  // Wait until the editor really shows the solution before checking anything.
  await expect(page.locator(".cm-content").first()).toContainText(solutionSnippet(slug));
}
