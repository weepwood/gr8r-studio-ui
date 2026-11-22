import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => { await page.goto("/"); });
const column = (page, key) => page.locator(`#demo-board [data-gr-column="${key}"]`);

test("kanban: keyboard pick-up, move across columns, drop and live count", async ({ page }) => {
  const card = page.locator('#demo-board [data-gr-card="DOC-013"]');
  await card.focus();
  await page.keyboard.press("Space");
  await expect(card).toHaveAttribute("data-gr-grabbed", "true");
  await page.keyboard.press("ArrowRight");
  await expect(column(page, "progress").locator('[data-gr-card="DOC-013"]')).toHaveCount(1);
  await expect(card).toBeFocused();
  await page.keyboard.press("Space");
  await expect(card).not.toHaveAttribute("data-gr-grabbed", "true");
  await expect(column(page, "progress").locator("[data-gr-count]")).toHaveText("3");
  await expect(column(page, "todo").locator("[data-gr-count]")).toHaveText("1");
  await expect(page.locator("#board-log")).toContainText("DOC-013");
});

test("kanban: Escape cancels a keyboard move and a cancelled gr-move reverts", async ({ page }) => {
  const card = page.locator('#demo-board [data-gr-card="QA-031"]');
  await card.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Escape");
  await expect(column(page, "todo").locator("[data-gr-card]").nth(1)).toHaveAttribute("data-gr-card", "QA-031");
  // The gallery rejects To do → Done (must pass Review): the event is cancelled and the card returns.
  await card.focus();
  await page.keyboard.press("Space");
  for (let i = 0; i < 3; i++) await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await expect(column(page, "todo").locator('[data-gr-card="QA-031"]')).toHaveCount(1);
  await expect(page.getByText("QA-031 needs Review before it can be Done.")).toBeVisible();
});

test("kanban: pointer drag moves a card between columns", async ({ page }) => {
  const card = page.locator('#demo-board [data-gr-card="DES-112"]');
  const target = column(page, "review").locator("[data-gr-list]");
  await card.scrollIntoViewIfNeeded();
  const from = await card.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + 20, from.y + 10);
  await page.mouse.down();
  await page.mouse.move(from.x + 40, from.y + 20, { steps: 4 });
  await page.mouse.move(to.x + 30, to.y + to.height - 5, { steps: 12 });
  await expect(page.locator(".gr-kanban-ghost")).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator(".gr-kanban-ghost")).toHaveCount(0);
  await expect(column(page, "review").locator('[data-gr-card="DES-112"]')).toHaveCount(1);
});

test("gr-select keeps the native select as the source of truth", async ({ page }) => {
  const combobox = page.getByRole("combobox", { name: "Project", exact: true });
  await combobox.focus();
  await page.keyboard.press("ArrowDown");
  await expect(combobox).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(combobox).toHaveAttribute("aria-expanded", "false");
  await expect(combobox).toBeFocused();
  await expect(page.locator('select[name="project"]')).toHaveValue("mobile");
  await expect(page.locator("#select-output")).toContainText("project=mobile");
  // Disabled options are skipped.
  await combobox.click();
  await expect(page.getByRole("option", { name: "Customer portal (no access)" })).toHaveAttribute("aria-disabled", "true");
  await page.keyboard.press("Escape");
});

test("status picker and date picker update their triggers and restore focus", async ({ page }) => {
  const status = page.getByRole("button", { name: "Status: In progress", exact: true });
  await status.click();
  await page.getByRole("option", { name: "Review", exact: true }).click();
  const updated = page.getByRole("button", { name: "Status: Review", exact: true });
  await expect(updated).toBeFocused();

  await page.getByRole("button", { name: "Due date: Nov 27", exact: true }).click();
  await expect(page.locator('gr-popover[data-demo-picker="date"] .gr-calendar__day[tabindex="0"]')).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Due date: Nov 28", exact: true })).toBeFocused();
});

test("assignee picker filters as you type", async ({ page }) => {
  const picker = page.locator('gr-popover[data-demo-picker="assignee"]');
  await picker.getByRole("button", { name: "Assignee: Jordan Wells", exact: true }).click();
  await picker.getByRole("searchbox", { name: "Filter people" }).fill("mor");
  await expect(picker.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Assignee: Morgan Kim", exact: true })).toBeFocused();
});

test("task context menu opens with Shift+F10 and acts on the focused row", async ({ page }) => {
  await page.locator("#task-rows .gr-task-row").first().getByRole("button", { name: /^Task details:/ }).focus();
  await page.keyboard.press("Shift+F10");
  await expect(page.getByRole("menuitem", { name: "Open details" })).toBeFocused();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.locator("#task-summary")).toHaveText("2 of 4 completed");
});

test("task drawer toggles completion and closes with Escape", async ({ page }) => {
  await page.getByRole("button", { name: "Task details: Review typography scale", exact: true }).click();
  await expect(page.locator("#task-details dialog")).toBeVisible();
  await page.locator("#detail-toggle").click();
  await expect(page.locator("#detail-toggle")).toHaveText("Reopen");
  await expect(page.locator("#task-summary")).toHaveText("2 of 4 completed");
  await page.keyboard.press("Escape");
  await expect(page.locator("#task-details dialog")).not.toBeVisible();
});

test("system theme and reduced motion preferences persist", async ({ page }) => {
  await page.getByRole("button", { name: "System", exact: true }).click();
  await expect(page.locator("body")).toHaveAttribute("data-gr-theme", "system");
  await page.getByRole("switch", { name: "Reduce motion" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-gr-motion", "reduce");
  await page.reload();
  await expect(page.locator("body")).toHaveAttribute("data-gr-motion", "reduce");
  await expect(page.getByRole("switch", { name: "Reduce motion" })).toHaveAttribute("aria-checked", "true");
});

test("component cards expose copyable code captured before upgrade", async ({ page }) => {
  const card = page.locator("#buttons [data-demo-code]").first();
  await card.getByRole("button", { name: "Code", exact: true }).click();
  const code = card.locator(".demo-code");
  await expect(code).toBeVisible();
  await expect(code).toContainText('class="gr-button gr-button--primary"');
  await expect(code).not.toContainText("data-toast");
  await card.getByRole("button", { name: "API", exact: true }).click();
  await expect(card.locator(".demo-api")).toContainText(".gr-button--primary");
  const switchCard = page.locator("#forms [data-demo-code]").nth(3);
  await switchCard.getByRole("button", { name: "Code", exact: true }).click();
  await expect(switchCard.locator(".demo-code")).toContainText('<gr-switch aria-label="Desktop notifications" checked></gr-switch>');
});

test("tabs indicator follows the selected tab", async ({ page }) => {
  const list = page.getByRole("tablist", { name: "Project views" });
  await expect(list).toHaveAttribute("data-gr-indicator", /ready|instant/);
  await page.getByRole("tab", { name: "Settings", exact: true }).click();
  const x = await list.evaluate(el => parseFloat(el.style.getPropertyValue("--gr-indicator-x")));
  expect(x).toBeGreaterThan(0);
});

test("new sections stay within the viewport on small screens", async ({ page }) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const id of ["motion", "pickers", "status", "patterns", "overlays"]) {
      await page.locator("#" + id).scrollIntoViewIfNeeded();
    }
    const widths = await page.locator("#main-content").evaluate(el => ({ client: el.clientWidth, scroll: el.scrollWidth }));
    expect(widths.scroll, `overflow at ${width}px`).toBeLessThanOrEqual(widths.client);
  }
});
