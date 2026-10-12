import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

test.describe("home", () => {
  test("shows the brand, the stats and all 12 exercises in order", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("Junior");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("to Mid");

    const rows = page.locator("#exercises ol > li");
    await expect(rows).toHaveCount(12);
    await expect(rows.first()).toContainText("01");
    await expect(rows.first()).toContainText("State: Build a Counter");
    await expect(rows.last()).toContainText("12");
  });

  test("the call to action opens the first exercise", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Start with 01/ }).click();
    await expect(page).toHaveURL(/\/exercises\/state-counter$/);
    await expect(page.getByRole("heading", { level: 1, name: "State: Build a Counter" })).toBeVisible();
  });

  test("an index row opens its exercise", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /Performance: The Slow List/ }).click();
    await expect(page).toHaveURL(/performance-memoization$/);
  });

  test("old Spanish URLs redirect to the new ones", async ({ page }) => {
    await page.goto("/ejercicios/contador-simple");
    await expect(page).toHaveURL(/\/exercises\/state-counter$/);
  });

  test("unknown exercises get a branded 404", async ({ page }) => {
    const response = await page.goto("/exercises/does-not-exist");
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Not here");
  });

  test("has no serious accessibility violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]), null, 2)).toEqual([]);
  });
});
