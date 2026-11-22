import { test, expect } from "@playwright/test";

const rows = page => page.locator("#task-rows .gr-task-row");

/** Visible text nodes that are Latin-only (no Han characters) outside code, data and brand names. */
async function untranslated(page) {
  return page.evaluate(() => {
    const skip = "pre, code, kbd, .gr-kbd, script, style, noscript, svg, [data-i18n-skip], .demo-code-view, .demo-api, .gr-avatar, #toast-stack, .gr-kanban-ghost";
    const allowed = [/^(g|gr8r|\/ ui|GR8R STUDIO UI|Gr8r Studio|Weepwood|GitHub|API|HTML \/ JS|CSS \+ Web Components)$/, /^v\d+\.\d+\.\d+$/, /^[A-Z]{2,4}-\d{3}$/, /^\d+(\.\d+)? (MB|KB)$/, /^(PDF|FIG|MD)$/, /^\.gr-[\w-]+\[[\w-]+\]$/];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const found = [];
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.data.replace(/\s+/g, " ").trim();
      if (!/[A-Za-z]{2,}/.test(text) || /[\u4e00-\u9fff]/.test(text)) continue;
      if (node.parentElement.closest(skip) || allowed.some(pattern => pattern.test(text))) continue;
      found.push(text);
    }
    return [...new Set(found)];
  });
}

test.describe("English browser", () => {
  test.beforeEach(async ({ page }) => { await page.goto("/"); });

  test("switches to Simplified Chinese and back, restoring the source text", async ({ page }) => {
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await page.locator("#toggle-language").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page).toHaveTitle("Gr8r Studio UI — 组件展示站");
    await expect(page.locator(".demo-task-toolbar").getByRole("button", { name: "添加任务", exact: true })).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "搜索任务", exact: true })).toHaveAttribute("placeholder", "搜索任务…");
    await expect(page.getByRole("button", { name: "切换到深色主题", exact: true })).toBeVisible();
    // Untouched sample tasks follow the language.
    await expect(rows(page).first()).toContainText("检查字号层级");
    await expect(page.locator("#task-summary")).toHaveText("已完成 1 / 4");
    expect(await untranslated(page)).toEqual([]);

    await page.locator("#toggle-language").click();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.locator(".demo-task-toolbar").getByRole("button", { name: "Add task", exact: true })).toBeVisible();
    await expect(rows(page).first()).toContainText("Review typography scale");
    await expect(page.locator("#task-summary")).toHaveText("1 of 4 completed");
  });

  test("language choice persists and edited tasks are never swapped", async ({ page }) => {
    await rows(page).first().getByRole("checkbox").check();
    await page.getByRole("button", { name: "简体中文", exact: true }).click();
    await expect(rows(page).first()).toContainText("Review typography scale"); // user data stays as written
    await expect(page.locator("#task-summary")).toHaveText("已完成 2 / 4");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.getByRole("button", { name: "简体中文", exact: true })).toHaveAttribute("aria-pressed", "true");
  });

  test("library elements localise their built-in strings", async ({ page }) => {
    await page.locator("#toggle-language").click();
    await expect(page.locator('#demo-board [data-gr-card="DOC-013"]')).toHaveAttribute("aria-roledescription", "可拖动卡片");
    await expect(page.locator("#demo-calendar .gr-calendar__label")).toHaveText("2026年11月");
    await expect(page.locator("#demo-calendar").getByRole("button", { name: "下个月", exact: true })).toBeVisible();
    await page.keyboard.press("Control+k");
    await page.getByRole("combobox", { name: "搜索命令", exact: true }).fill("zzzz");
    await expect(page.getByText("没有匹配的命令", { exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    const project = page.getByRole("combobox", { name: "项目", exact: true });
    await project.click();
    await expect(page.getByRole("option", { name: "移动应用", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");
    // Keyboard board move is announced in Chinese.
    const card = page.locator('#demo-board [data-gr-card="DOC-013"]');
    await card.focus();
    await page.keyboard.press("Space");
    await expect(page.locator("#demo-board [aria-live]")).toContainText("已拿起");
    await page.keyboard.press("Escape");
  });

  test("pickers and generated labels update in Chinese", async ({ page }) => {
    await page.locator("#toggle-language").click();
    await page.getByRole("button", { name: "状态：进行中", exact: true }).click();
    await page.getByRole("option", { name: "评审", exact: true }).click();
    await expect(page.getByRole("button", { name: "状态：评审", exact: true })).toBeFocused();
    await expect(page.getByRole("button", { name: "截止日期：11月27日", exact: true })).toBeVisible();
    await page.locator(".demo-task-toolbar").getByRole("button", { name: "添加任务", exact: true }).click();
    await page.getByLabel("任务标题", { exact: true }).fill("写周报");
    await page.locator('#create-task-form [name="priority"]').selectOption("High");
    await page.locator('#create-task-form button[type="submit"]').click();
    await expect(page.getByText("已创建任务：写周报")).toBeVisible();
    await expect(rows(page).last()).toContainText("高");
  });
});

test.describe("Chinese browser", () => {
  test.use({ locale: "zh-CN" });
  test("first visit follows the browser language with Chinese sample tasks", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("lang", "zh-CN");
    await expect(page.locator("html")).not.toHaveClass(/demo-i18n-pending/);
    await expect(rows(page)).toHaveCount(4);
    await expect(rows(page).first()).toContainText("检查字号层级");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("为专注而设计");
  });
});
