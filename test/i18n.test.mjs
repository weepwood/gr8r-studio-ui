import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { gr8rMessages, gr8rLocales, grT, matchGr8rLocale, registerGr8rMessages, resolveGr8rLocale, formatMessage, applyGr8rLocale } from "../src/index.js";
import { PHRASES, MESSAGES, LOCALES, phrase, message, preferredLocale, matchLocale } from "../demo/i18n.js";
import { DEFAULT_TASKS, DEFAULT_TASKS_ZH, isSampleSet, normalizeState, loadState, resetState, selectTasks } from "../demo/state.js";

const load = path => readFile(new URL(path, import.meta.url), "utf8");
const placeholders = text => [...String(text).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();

test("library messages: every locale has every key with the same placeholders", () => {
  const en = gr8rMessages("en");
  for (const locale of ["zh-CN"]) {
    const other = gr8rMessages(locale);
    assert.deepEqual(Object.keys(other).sort(), Object.keys(en).sort(), locale + " keys");
    for (const key of Object.keys(en)) assert.deepEqual(placeholders(other[key]), placeholders(en[key]), `${locale} ${key}`);
  }
  assert.ok(gr8rLocales().includes("zh-CN"));
});

test("locale matching: exact, language family, Chinese variants and fallback", () => {
  assert.equal(matchGr8rLocale("zh-CN"), "zh-CN");
  assert.equal(matchGr8rLocale("zh"), "zh-CN");
  assert.equal(matchGr8rLocale("zh-Hans-CN"), "zh-CN");
  assert.equal(matchGr8rLocale("ZH-tw"), "zh-CN");
  assert.equal(matchGr8rLocale("en-GB"), "en");
  assert.equal(matchGr8rLocale("fr"), "en");
  assert.equal(matchGr8rLocale("not a tag"), "en");
  assert.equal(matchGr8rLocale(undefined), "en");
  const element = { closest: () => ({ getAttribute: () => "zh-CN" }) };
  assert.equal(resolveGr8rLocale(element), "zh-CN");
  assert.equal(grT(element, "kanban.dropped", { card: "A", column: "完成", position: 2, total: 3 }), "已将 A 放入 完成，第 2 位，共 3 位。");
  assert.equal(grT({ closest: () => null }, "popover.empty"), "No matches");
  assert.equal(grT(element, "unknown.key"), "unknown.key");
  assert.equal(formatMessage("{a} {missing}", { a: 1 }), "1 {missing}");
});

test("apps can register or extend a locale, with validation", () => {
  registerGr8rMessages("ja", { "popover.empty": "一致する項目はありません" });
  const element = { closest: () => ({ getAttribute: () => "ja-JP" }) };
  assert.equal(grT(element, "popover.empty"), "一致する項目はありません");
  assert.equal(grT(element, "calendar.next"), "Next month"); // falls back to English
  assert.throws(() => registerGr8rMessages("bad tag!", {}), RangeError);
  assert.throws(() => registerGr8rMessages("de", { x: 1 }), TypeError);
});

test("applyGr8rLocale sets lang and refreshes every element exactly once", () => {
  const calls = [];
  const child = { localize: () => calls.push("child") };
  const attrs = {};
  const target = { setAttribute: (k, v) => { attrs[k] = v; }, querySelectorAll: () => [child], localize: () => calls.push("root") };
  applyGr8rLocale(target, "zh-CN");
  assert.equal(attrs.lang, "zh-CN");
  assert.deepEqual(calls, ["root", "child"]);
  assert.throws(() => applyGr8rLocale(target, "??"), RangeError);
  assert.throws(() => applyGr8rLocale(null, "en"), TypeError);
});

test("components no longer hard-code English for built-in strings", async () => {
  for (const file of ["../src/elements.js", "../src/overlays.js", "../src/board.js", "../src/calendar.js"]) {
    const source = await load(file);
    for (const text of ["Dismiss notification", "No matching commands", "No matches", "Previous month", "Next month", "Picked up", "draggable card", '"Toggle"', '"Context menu"']) {
      assert.ok(!source.includes(text), `${file} still contains "${text}"`);
    }
    assert.match(source, /grT\(/, file + " uses grT");
  }
});

test("gallery messages: both languages define the same keys and placeholders", () => {
  assert.deepEqual(LOCALES, ["en", "zh-CN"]);
  assert.deepEqual(Object.keys(MESSAGES["zh-CN"]).sort(), Object.keys(MESSAGES.en).sort());
  for (const key of Object.keys(MESSAGES.en)) assert.deepEqual(placeholders(MESSAGES["zh-CN"][key]), placeholders(MESSAGES.en[key]), key);
  assert.equal(message("zh-CN", "task.summary", { done: 2, total: 4 }), "已完成 2 / 4");
  assert.equal(message("fr", "task.summary", { done: 2, total: 4 }), "2 of 4 completed");
});

test("phrases are reversible, so switching back to English restores the source text", () => {
  const values = Object.values(PHRASES);
  assert.equal(new Set(values).size, values.length, "two English phrases share a Chinese translation");
  for (const [en, zh] of Object.entries(PHRASES)) {
    assert.ok(zh.trim(), "empty translation for " + en);
    assert.equal(phrase(en, "zh-CN"), zh);
    assert.equal(phrase(zh, "en"), en);
  }
  assert.equal(phrase("  Add task ", "zh-CN"), "添加任务");
  assert.equal(phrase("user typed text", "zh-CN"), "user typed text");
});

test("browser and saved language preferences resolve predictably", () => {
  assert.equal(preferredLocale("en", ["zh-CN"]), "en");
  assert.equal(preferredLocale(undefined, ["zh-TW", "en"]), "zh-CN");
  assert.equal(preferredLocale("xx", ["de-DE"]), "en");
  assert.equal(matchLocale("zh"), "zh-CN");
  assert.equal(matchLocale("zhx"), "en");
});

/* Minimal tokenizer: visible text and labelled attributes of index.html outside skipped regions. */
function authoredStrings(html) {
  const skipTags = new Set(["pre", "code", "kbd", "script", "style", "svg", "noscript", "title"]);
  const voids = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr", "use", "rect", "circle", "path", "symbol"]);
  const found = new Set();
  const stack = [];
  const skipping = () => stack.some(entry => entry.skip);
  const body = html.slice(html.indexOf("<body"));
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  for (let match; (match = re.exec(body));) {
    const [, closing, rawTag, attrs = "", selfClose, text] = match;
    if (text !== undefined) {
      const value = text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();
      if (value && /[A-Za-z]/.test(value) && !skipping()) found.add(value);
      continue;
    }
    if (!rawTag) continue;
    const tag = rawTag.toLowerCase();
    if (closing) {
      const index = stack.map(entry => entry.tag).lastIndexOf(tag);
      if (index !== -1) stack.length = index;
      continue;
    }
    const skip = skipTags.has(tag) || /\sdata-i18n-skip\b/.test(attrs) || /class="[^"]*\b(gr-kbd|gr-avatar)\b/.test(attrs);
    if (!skip && !skipping()) {
      for (const [, name, value] of attrs.matchAll(/\s(aria-label|placeholder|data-gr-tooltip|data-toast|label|title)="([^"]*)"/g)) {
        if (/[A-Za-z]/.test(value)) found.add(value.replace(/&amp;/g, "&"));
      }
    }
    if (!voids.has(tag) && !selfClose) stack.push({ tag, skip });
  }
  return [...found];
}
const NOT_TRANSLATED = [
  /^(g|gr8r|\/ ui|GR8R STUDIO UI|Gr8r Studio|Weepwood|GitHub|API|HTML \/ JS|CSS \+ Web Components)$/,
  /^v\d+\.\d+\.\d+$/, /^[A-Z]{2,4}-\d{3}$/, /^\d+(\.\d+)? (MB|KB)$/, /^(PDF|FIG|MD)$/, /^\.gr-[\w-]+\[[\w-]+\]$/
];

test("every visible English string in the gallery has a Simplified Chinese translation", async () => {
  const strings = authoredStrings(await load("../index.html"));
  assert.ok(strings.length > 300, "tokenizer found too little text: " + strings.length);
  const missing = strings.filter(text => !Object.hasOwn(PHRASES, text) && !NOT_TRANSLATED.some(pattern => pattern.test(text)));
  assert.deepEqual(missing, []);
});

test("generated strings in demo.js go through the message table", async () => {
  const source = await load("../demo/demo.js");
  assert.ok(!/toast\("[A-Z]/.test(source), "toast() with a hard-coded English literal");
  assert.ok(!/textContent = "[A-Z][a-z]+ [a-z]/.test(source), "hard-coded English sentence assigned to textContent");
  for (const match of source.matchAll(/\bt\("([\w.]+)"\s*[,)]/g)) assert.ok(Object.hasOwn(MESSAGES.en, match[1]), "unknown message key " + match[1]);
});

test("Chinese sample tasks mirror the English ones and swap only while untouched", () => {
  assert.deepEqual(DEFAULT_TASKS_ZH.map(({ id, priority, category, assignee, done }) => [id, priority, category, assignee, done]),
    DEFAULT_TASKS.map(({ id, priority, category, assignee, done }) => [id, priority, category, assignee, done]));
  const zh = normalizeState(null, { locale: "zh-CN" });
  assert.equal(zh.tasks[0].title, "检查字号层级");
  assert.ok(isSampleSet(zh.tasks, "zh-CN"));
  zh.tasks[0].done = true;
  assert.ok(!isSampleSet(zh.tasks, "zh-CN"));
  assert.equal(resetState({ preferences: { locale: "zh-CN" } }, { locale: "zh-CN" }).tasks[1].title, "开发可复用下拉菜单");
  // A saved language decides first-run samples over the browser guess.
  const storage = { getItem: () => JSON.stringify({ preferences: { locale: "en" } }) };
  assert.equal(loadState(storage, { locale: "zh-CN" }).tasks[0].title, DEFAULT_TASKS[0].title);
  assert.equal(normalizeState({ preferences: { locale: "zh-CN" } }).preferences.locale, "zh-CN");
});

test("search matches displayed labels and title sort is locale-aware", () => {
  const tasks = DEFAULT_TASKS_ZH;
  const describe = task => [{ Design: "设计", Frontend: "前端", QA: "测试" }[task.category]];
  assert.equal(selectTasks(tasks, { query: "设计", describe }).length, 2);
  const sorted = selectTasks(tasks, { sort: "title", locale: "zh-CN" }).map(task => task.title);
  assert.deepEqual(sorted, [...sorted].sort((a, b) => a.localeCompare(b, "zh-CN")));
});
