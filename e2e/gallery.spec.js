import { test, expect } from "@playwright/test";

const rows = page => page.locator("#task-rows .gr-task-row");
test.beforeEach(async ({ page }) => { await page.goto("/"); });

test("task search, sorting, empty state and keyboard completion stay in sync", async ({ page }) => {
  await expect(rows(page)).toHaveCount(4);
  await page.getByRole("searchbox", { name: "Search tasks", exact: true }).fill("nothing-matches");
  await expect(rows(page)).toHaveCount(0);
  await expect(page.getByText("No matching tasks", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(rows(page)).toHaveCount(4);
  await page.getByLabel("Sort tasks", { exact: true }).selectOption("priority");
  await expect(rows(page).first()).toContainText("Review typography scale");
  await page.locator("#tasks-filter").click();
  await expect(rows(page)).toHaveCount(3);
  const checkbox = rows(page).first().getByRole("checkbox");
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator("#tasks-filter")).toBeFocused();
  await expect(page.locator("#task-summary")).toHaveText("2 of 4 completed");
  await page.reload();
  await expect(page.locator("#task-summary")).toHaveText("2 of 4 completed");
});

test("create, read details, persist, delete and undo a task with text-safe content", async ({ page }) => {
  test.setTimeout(60_000);
  const title = '<img src=x onerror=alert(1)> Review tokens';
  await page.locator(".demo-task-toolbar").getByRole("button", { name: "Add task", exact: true }).click();
  await expect(page.locator("#task-title-input")).toBeFocused();
  await page.getByLabel("Task title", { exact: true }).fill(title);
  await page.locator('#create-task-form [name="priority"]').selectOption("High");
  await page.locator('#create-task-form [name="description"]').fill("These details must survive a reload.");
  await page.locator('#create-task-form button[type="submit"]').click();
  await expect(rows(page)).toHaveCount(5);
  await page.reload();
  await page.getByRole("button", { name: "Task details: " + title, exact: true }).click();
  await expect(page.locator("#detail-description")).toHaveText("These details must survive a reload.");
  await expect(page.locator("#detail-priority")).toHaveText("High priority");
  await expect(page.locator("#task-rows img")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Task details: " + title, exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Delete task: " + title, exact: true }).click();
  await expect(rows(page)).toHaveCount(4);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(rows(page)).toHaveCount(5);
  await page.reload();
  await expect(rows(page)).toHaveCount(5);
});

test("appearance preferences survive refresh and command palette supports empty results", async ({ page }) => {
  await page.getByRole("button", { name: "Switch to dark theme", exact: true }).click();
  await page.getByRole("button", { name: "Teal", exact: true }).click();
  await page.getByLabel("Density", { exact: true }).selectOption("compact");
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-gr-theme", "dark");
  await expect(page.locator("body")).toHaveAttribute("data-gr-accent", "teal");
  await expect(page.getByLabel("Density", { exact: true })).toHaveValue("compact");
  await page.keyboard.press("Control+k");
  const search = page.getByRole("combobox", { name: "Search commands", exact: true });
  await search.fill("zzzz");
  await expect(page.getByText("No matching commands", { exact: true })).toBeVisible();
  await search.fill("Create task");
  await page.keyboard.press("Enter");
  await expect(page.locator("#create-dialog dialog")).toBeVisible();
  await expect(page.locator("#command-palette dialog")).not.toBeVisible();
  await expect(page.locator("#task-title-input")).toBeFocused();
  // Global palette shortcuts must not stack another modal over a form.
  await page.keyboard.press("Control+k");
  await expect(page.locator("#command-palette dialog")).not.toBeVisible();
});

test("mobile navigation traps focus, closes with Escape and does not overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator("#mobile-nav");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#sidebar")).toHaveAttribute("aria-modal", "true");
  await expect(page.locator("#main-content")).toHaveJSProperty("inert", true);
  await page.getByRole("link", { name: "Overview", exact: true }).focus();
  await page.keyboard.press("Shift+Tab");
  await expect(page.getByRole("link", { name: "Build something great", exact: false })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(page.locator("#main-content")).toHaveJSProperty("inert", false);
  await toggle.click();
  await page.getByRole("link", { name: "Form controls", exact: true }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  const widths = await page.locator("#main-content").evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
});

test("dropdown ArrowUp opens at last enabled item and Escape restores focus", async ({ page }) => {
  const trigger = page.locator("gr-dropdown [data-gr-trigger]");
  await trigger.focus();
  await page.keyboard.press("ArrowUp");
  await expect(page.getByRole("menuitem", { name: "Move to archive", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
});

test("blocked storage degrades gracefully without breaking task interactions", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("Blocked", "SecurityError"); } });
  });
  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  await expect(page.locator("#save-status")).toHaveText("This visit only");
  await rows(page).first().getByRole("checkbox").check();
  await expect(page.locator("#task-summary")).toHaveText("2 of 4 completed");
});

test("reconnecting the command palette does not duplicate its empty state", async ({ page }) => {
  await page.locator("#command-palette").evaluate(el => { el.remove(); document.body.append(el); });
  await page.keyboard.press("Control+k");
  await page.getByRole("combobox", { name: "Search commands", exact: true }).fill("zzzz");
  await expect(page.locator(".gr-command-empty")).toHaveCount(1);
});

test("gallery has no runtime errors, broken local assets or exposed Git metadata", async ({ page, request }) => {
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("response", response => { if (response.status() >= 400) errors.push(response.url()); });
  await page.reload();
  await expect(rows(page)).toHaveCount(4);
  await page.locator("#toggle-theme").click();
  expect(errors).toEqual([]);
  expect((await request.get("/.git/HEAD")).status()).toBe(403);
});

test("responsive layouts fit the main viewport at small, tablet and desktop widths", async ({ page }) => {
  for (const width of [320, 390, 760, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const widths = await page.locator("#main-content").evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    expect(widths.scroll, `Main content overflow at ${width}px`).toBeLessThanOrEqual(widths.client);
  }
});

test("nested tabs do not change parent selection", async ({ page }) => {
  await page.locator("#panel-overview").evaluate(panel => {
    const nested = document.createElement("gr-tabs");
    nested.innerHTML = '<div role="tablist" aria-label="Nested tabs"><button role="tab" id="nested-a" aria-controls="nested-panel-a" aria-selected="true">Nested A</button><button role="tab" id="nested-b" aria-controls="nested-panel-b">Nested B</button></div><div role="tabpanel" id="nested-panel-a">A</div><div role="tabpanel" id="nested-panel-b" hidden>B</div>';
    panel.append(nested);
    // Reconnect to exercise parent discovery with nested markup already present.
    const outer = panel.closest("gr-tabs");
    const parent = outer.parentNode;
    outer.remove(); parent.append(outer);
  });
  await page.getByRole("tab", { name: "Nested B", exact: true }).click();
  await expect(page.locator("#tab-overview")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#nested-b")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#nested-panel-b")).toBeVisible();
});
