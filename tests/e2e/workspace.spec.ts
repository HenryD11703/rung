import AxeBuilder from "@axe-core/playwright";
import { exercises } from "../../app/lib/exercises-registry";
import { expect, isMobile, openPane, revealSolution, runChecks, test } from "./fixtures";

const COUNTER = "/exercises/state-counter";

test.describe("workspace", () => {
  test("lists the requirements before anything has run", async ({ page }, info) => {
    await page.goto(COUNTER);
    await openPane(page, info.project.name, "Checks");

    await expect(page.getByRole("heading", { name: "Requirements" })).toBeVisible();
    await expect(page.locator("li[data-status='pending']")).toHaveCount(7);
    await expect(page.getByRole("button", { name: "Ask the mentor" })).toBeDisabled();
  });

  test("failing checks explain what is missing", async ({ page }, info) => {
    await page.goto(COUNTER);
    await openPane(page, info.project.name, "Checks");
    await runChecks(page);

    await expect(page.locator("li[data-status='pass']")).toHaveCount(0);
    await expect(page.locator("li[data-status='fail']")).toHaveCount(7);
    await expect(page.getByText("Use const [count, setCount] = useState(0).")).toBeVisible();
  });

  test("revealing the solution makes every check pass and saves progress", async ({ page }, info) => {
    await page.goto(COUNTER);
    await revealSolution(page, info.project.name, "state-counter");
    await openPane(page, info.project.name, "Checks");
    await runChecks(page);

    await expect(page.getByText("Matches the solution.")).toBeVisible();
    await expect(page.locator("li[data-status='pass']")).toHaveCount(7);

    await page.goto("/");
    await expect(page.getByRole("link", { name: /State: Build a Counter/ })).toContainText("◐");
    await expect(page.getByLabel("1 of 12 exercises completed")).toBeVisible();
  });

  test("reset puts the starter code back", async ({ page }, info) => {
    await page.goto(COUNTER);
    await revealSolution(page, info.project.name, "state-counter");
    await page.getByRole("button", { name: "Reset" }).click();
    await openPane(page, info.project.name, "Checks");
    await runChecks(page);
    await expect(page.locator("li[data-status='fail']")).toHaveCount(7);
  });

  test("Ctrl+Enter runs the checks from the editor", async ({ page }, info) => {
    test.skip(isMobile(info.project.name), "keyboard shortcut is a desktop feature");
    await page.goto(COUNTER);
    await page.locator(".cm-content").first().click();
    await page.keyboard.press("Control+Enter");
    await expect(page.locator("li[data-status='fail']")).toHaveCount(7);
  });

  test("a syntax error is reported instead of failing every check", async ({ page }, info) => {
    await page.goto(COUNTER);
    await openPane(page, info.project.name, "Code");
    const editor = page.locator(".cm-content").first();
    await editor.click();
    await page.keyboard.press("Control+a");
    await page.keyboard.type("const a = ;");

    await openPane(page, info.project.name, "Checks");
    await runChecks(page);
    await expect(page.getByRole("alert").filter({ hasText: "Syntax error" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask the mentor" })).toBeDisabled();
  });

  test("editing after a run marks the result as out of date", async ({ page }, info) => {
    await page.goto(COUNTER);
    await openPane(page, info.project.name, "Checks");
    await runChecks(page);
    await openPane(page, info.project.name, "Code");
    await page.locator(".cm-content").first().click();
    await page.keyboard.type("// edit");
    await openPane(page, info.project.name, "Checks");
    await expect(page.getByText(/Your code changed since the last run/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask the mentor" })).toBeDisabled();
  });

  test("the editor preview renders the starter app", async ({ page }, info) => {
    await page.goto(COUNTER);
    await openPane(page, info.project.name, "Preview");
    await expect(page.frameLocator("iframe").first().getByRole("button", { name: "Increment" })).toBeVisible({
      timeout: 45_000,
    });
  });
});

test.describe("AI mentor (API mocked)", () => {
  const feedback = {
    summary: "You are close.",
    strengths: ["Clear component name."],
    fixes: ["Import useState by name."],
    nextStep: "Try the next exercise.",
  };

  async function readyForMentor(page: import("@playwright/test").Page, project: string) {
    await page.goto(COUNTER);
    await openPane(page, project, "Checks");
    await runChecks(page);
  }

  test("shows the feedback and sends only slug, files and runtime failures", async ({ page }, info) => {
    let body: Record<string, unknown> = {};
    await page.route("**/api/review", async (route) => {
      body = route.request().postDataJSON();
      await route.fulfill({ json: { feedback, failed: ["named-import"], cached: false } });
    });

    await readyForMentor(page, info.project.name);
    await page.getByRole("button", { name: "Ask the mentor" }).click();

    await expect(page.getByText("You are close.")).toBeVisible();
    await expect(page.getByText("Import useState by name.")).toBeVisible();
    expect(Object.keys(body).sort()).toEqual(["files", "runtimeFailed", "slug"]);
    expect(body.slug).toBe("state-counter");
    expect(Object.keys(body.files as object)).toEqual(["/App.js"]);
  });

  test("asking twice with the same code does not call the API twice", async ({ page }, info) => {
    let calls = 0;
    await page.route("**/api/review", async (route) => {
      calls += 1;
      await route.fulfill({ json: { feedback, failed: [], cached: false } });
    });

    await readyForMentor(page, info.project.name);
    const ask = page.getByRole("button", { name: "Ask the mentor" });
    await ask.click();
    await expect(page.getByText("You are close.")).toBeVisible();
    await ask.click();
    await expect(page.getByText("You are close.")).toBeVisible();
    expect(calls).toBe(1);
  });

  test("a rate limit shows a countdown and blocks the button", async ({ page }, info) => {
    await page.route("**/api/review", (route) =>
      route.fulfill({
        status: 429,
        headers: { "Retry-After": "30" },
        json: { error: { code: "rate_limited", message: "Too many reviews. Try again in 30 seconds.", retryAfterSeconds: 30 } },
      }),
    );

    await readyForMentor(page, info.project.name);
    await page.getByRole("button", { name: "Ask the mentor" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Too many reviews" })).toBeVisible();
    await expect(page.getByRole("button", { name: /Wait \d+s/ })).toBeDisabled();
  });

  test("an upstream failure explains that the checks still work", async ({ page }, info) => {
    await readyForMentor(page, info.project.name); // default fixture returns 500
    await page.getByRole("button", { name: "Ask the mentor" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Unmocked API call" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Ask the mentor" })).toBeEnabled();
  });
});

test.describe("every reference solution passes in a real browser", () => {
  // Runs the same checks users see, including the Web Worker ones.
  for (const exercise of exercises) {
    test(exercise.slug, async ({ page }, info) => {
      test.skip(isMobile(info.project.name), "covered on desktop; mobile has its own navigation tests");
      await page.goto(`/exercises/${exercise.slug}`);
      await revealSolution(page, info.project.name, exercise.slug);
      await runChecks(page);

      await expect(page.getByText("Matches the solution.")).toBeVisible();
      await expect(page.locator("li[data-status='fail']")).toHaveCount(0);
      await expect(page.locator("li[data-status='pass']")).toHaveCount(exercise.checks.length);
    });
  }
});

test.describe("mobile navigation", () => {
  test("shows one pane at a time and keeps the score on the tab", async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), "mobile only");
    await page.goto(COUNTER);

    const tabs = page.getByRole("navigation", { name: "Workspace sections" });
    await expect(tabs).toBeVisible();
    await expect(page.getByRole("heading", { level: 1, name: "State: Build a Counter" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Run checks" })).toBeHidden();

    await tabs.getByRole("button", { name: /^Checks/ }).click();
    await expect(page.getByRole("button", { name: "Run checks" })).toBeVisible();
    await runChecks(page);
    await expect(tabs.getByRole("button", { name: /^Checks/ })).toContainText("0/7");

    await revealSolution(page, info.project.name, "state-counter");
    await openPane(page, info.project.name, "Checks");
    await runChecks(page);
    await expect(tabs.getByRole("button", { name: /^Checks/ })).toContainText("7/7");
  });

  test("the page never scrolls sideways", async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), "mobile only");
    for (const path of ["/", COUNTER, "/exercises/custom-hooks"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `horizontal overflow on ${path}`).toBeLessThanOrEqual(0);
    }
  });

  test("tap targets are at least 44px tall", async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), "mobile only");
    await page.goto(COUNTER);
    const tabs = page.getByRole("navigation", { name: "Workspace sections" }).getByRole("button");
    for (const box of await tabs.evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("navigation", () => {
  test("previous/next and the index dialog move between exercises", async ({ page }) => {
    await page.goto(COUNTER);
    await page.getByRole("link", { name: "Next exercise" }).click();
    await expect(page).toHaveURL(/lists-and-keys$/);

    await page.getByRole("button", { name: /Index|All exercises/ }).click();
    const dialog = page.getByRole("dialog", { name: "All exercises" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("link", { name: /Performance: The Slow List/ }).click();
    await expect(page).toHaveURL(/performance-memoization$/);
  });

  test("the first exercise has no previous link", async ({ page }) => {
    await page.goto(COUNTER);
    await expect(page.getByLabel("Previous exercise (none)")).toBeVisible();
  });

  test("workspace has no serious accessibility violations", async ({ page }, info) => {
    await page.goto(COUNTER);
    await openPane(page, info.project.name, "Checks");
    await runChecks(page);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      // Sandpack renders third-party editor and iframe internals.
      .exclude(".sp-wrapper")
      .exclude("iframe")
      .analyze();
    const serious = results.violations.filter((v) => ["serious", "critical"].includes(v.impact ?? ""));
    expect(serious, JSON.stringify(serious.map((v) => [v.id, v.nodes.map((n) => n.target)]), null, 2)).toEqual([]);
  });
});

test.describe("resizable panes", () => {
  const BRIEF = "Resize the brief panel";
  const COLUMN = "Resize the preview and checks column";
  const SPLIT = "Resize the preview and checks split";

  const size = async (page: import("@playwright/test").Page, region: string) =>
    (await page.getByRole("region", { name: region }).boundingBox())!;

  async function drag(page: import("@playwright/test").Page, name: string, dx: number, dy: number) {
    const box = (await page.getByRole("separator", { name }).boundingBox())!;
    const x = box.x + box.width / 2;
    const y = box.y + box.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + dx, y + dy, { steps: 10 });
    await page.mouse.up();
  }

  test.beforeEach(async ({}, info) => {
    test.skip(isMobile(info.project.name), "dividers are a desktop feature");
  });

  test("exposes three accessible separators", async ({ page }) => {
    await page.goto(COUNTER);
    for (const name of [BRIEF, COLUMN, SPLIT]) {
      const separator = page.getByRole("separator", { name });
      await expect(separator).toBeVisible();
      await expect(separator).toHaveAttribute("aria-valuenow", /\d+/);
      await expect(separator).toHaveAttribute("aria-valuemin", /\d+/);
      await expect(separator).toHaveAttribute("aria-valuemax", /\d+/);
    }
  });

  test("dragging the brief divider resizes the brief and the editor", async ({ page }) => {
    await page.goto(COUNTER);
    const before = await size(page, "Brief");
    const editorBefore = await size(page, "Code editor");

    await drag(page, BRIEF, 120, 0);

    const after = await size(page, "Brief");
    const editorAfter = await size(page, "Code editor");
    expect(after.width).toBeGreaterThan(before.width + 100);
    expect(editorAfter.width).toBeLessThan(editorBefore.width - 100);
  });

  test("sizes stay inside their limits", async ({ page }) => {
    await page.goto(COUNTER);
    await drag(page, BRIEF, -2000, 0);
    expect((await size(page, "Brief")).width).toBeGreaterThanOrEqual(259);
    expect((await size(page, "Brief")).width).toBeLessThanOrEqual(262);

    await drag(page, BRIEF, 3000, 0);
    expect((await size(page, "Brief")).width).toBeLessThanOrEqual(562);
    // The editor never disappears.
    expect((await size(page, "Code editor")).width).toBeGreaterThanOrEqual(319);
  });

  test("the right column can be widened by dragging its divider left", async ({ page }) => {
    await page.goto(COUNTER);
    const before = await size(page, "Checks");
    await drag(page, COLUMN, -150, 0);
    const after = await size(page, "Checks");
    expect(after.width).toBeGreaterThan(before.width + 120);
  });

  test("dragging across the preview iframe still works", async ({ page }) => {
    await page.goto(COUNTER);
    await expect(page.frameLocator("iframe").first().getByRole("button", { name: "Increment" })).toBeVisible({
      timeout: 45_000,
    });
    const before = await size(page, "Checks");
    const previewBefore = await size(page, "Preview");

    // Up through the iframe: the checks panel grows, the preview shrinks.
    await drag(page, SPLIT, 0, -150);

    const after = await size(page, "Checks");
    const previewAfter = await size(page, "Preview");
    expect(after.height).toBeGreaterThan(before.height + 120);
    expect(previewAfter.height).toBeLessThan(previewBefore.height - 120);
  });

  test("keyboard: arrows resize, Home and End jump, Enter resets", async ({ page }) => {
    await page.goto(COUNTER);
    const separator = page.getByRole("separator", { name: BRIEF });
    const start = (await size(page, "Brief")).width;

    await separator.focus();
    await page.keyboard.press("ArrowRight");
    expect((await size(page, "Brief")).width).toBeCloseTo(start + 16, 0);

    await page.keyboard.press("Shift+ArrowLeft");
    expect((await size(page, "Brief")).width).toBeCloseTo(start + 16 - 64, 0);

    await page.keyboard.press("End");
    await expect(separator).toHaveAttribute("aria-valuenow", "560");
    await page.keyboard.press("Home");
    await expect(separator).toHaveAttribute("aria-valuenow", "260");

    await page.keyboard.press("Enter");
    await expect(separator).toHaveAttribute("aria-valuenow", "360");
  });

  test("double-click restores the default size", async ({ page }) => {
    await page.goto(COUNTER);
    const original = (await size(page, "Brief")).width;
    await drag(page, BRIEF, 100, 0);
    await page.getByRole("separator", { name: BRIEF }).dblclick();
    expect((await size(page, "Brief")).width).toBeCloseTo(original, 0);
  });

  test("the layout is remembered after a reload and shared across exercises", async ({ page }) => {
    await page.goto(COUNTER);
    await drag(page, BRIEF, 100, 0);
    const resized = (await size(page, "Brief")).width;

    await page.reload();
    await expect.poll(async () => (await size(page, "Brief")).width).toBeCloseTo(resized, 0);

    await page.goto("/exercises/lists-and-keys");
    await expect.poll(async () => (await size(page, "Brief")).width).toBeCloseTo(resized, 0);
  });

  test("a corrupted saved layout falls back to the defaults", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("rung:layout:v1", '{"brief":"wide","right":-5,"checks":9999}'));
    await page.goto(COUNTER);
    const separator = page.getByRole("separator", { name: BRIEF });
    await expect(separator).toHaveAttribute("aria-valuenow", "360");
    await expect(page.getByRole("separator", { name: COLUMN })).toHaveAttribute("aria-valuenow", "300");
    await expect(page.getByRole("separator", { name: SPLIT })).toHaveAttribute("aria-valuenow", "80");
  });
});

test.describe("dividers on phones", () => {
  test("are not shown", async ({ page }, info) => {
    test.skip(!isMobile(info.project.name), "mobile only");
    await page.goto(COUNTER);
    // Hidden elements are not exposed to assistive tech either.
    await expect(page.getByRole("separator")).toHaveCount(0);
    for (const separator of await page.locator("[role=separator]").all()) await expect(separator).toBeHidden();
  });
});
