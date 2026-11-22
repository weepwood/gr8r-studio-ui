import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { ELEMENTS, applyGr8rPreferences, defineGr8rElements } from "../src/index.js";

test("twelve independent custom elements are published", () => {
  assert.deepEqual(Object.keys(ELEMENTS).sort(), [
    "gr-calendar", "gr-command-palette", "gr-context-menu", "gr-dialog", "gr-drawer",
    "gr-dropdown", "gr-kanban", "gr-popover", "gr-select", "gr-switch",
    "gr-tabs", "gr-toast-stack"
  ]);
});

test("element registration is idempotent", () => {
  const constructors = new Map();
  const registry = {
    get: name => constructors.get(name),
    define: (name, constructor) => {
      assert.equal(constructors.has(name), false);
      constructors.set(name, constructor);
    }
  };
  defineGr8rElements(registry);
  defineGr8rElements(registry);
  assert.equal(constructors.size, Object.keys(ELEMENTS).length);
});

test("preferences are validated and scoped to the target", () => {
  const values = {};
  const target = { setAttribute: (name, value) => { values[name] = value; } };
  applyGr8rPreferences(target, { theme: "dark", accent: "teal", density: "compact" });
  assert.deepEqual(values, {
    "data-gr-theme": "dark",
    "data-gr-accent": "teal",
    "data-gr-density": "compact"
  });
  assert.throws(() => applyGr8rPreferences(target, { theme: "invalid" }), RangeError);
  assert.throws(() => applyGr8rPreferences(null, {}), TypeError);
});

test("gallery exercises every custom element tag", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const tag of Object.keys(ELEMENTS)) {
    assert.ok(html.includes("<" + tag), "Missing gallery example for " + tag);
  }
  assert.match(html, /role="tablist"/);
  assert.match(html, /role="menu"/);
  assert.match(html, /aria-label="Command palette"/);
});

test("light and dark theme, density and motion fallbacks exist", async () => {
  const css = await readFile(new URL("../src/tokens.css", import.meta.url), "utf8");
  assert.match(css, /data-gr-theme="dark"/);
  assert.match(css, /data-gr-density="compact"/);
  assert.match(css, /prefers-reduced-motion/);
});

test("package contains no runtime dependency and exposes stylesheet", async () => {
  const pkg = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(pkg.dependencies || {}, {});
  assert.equal(pkg.exports["./styles.css"], "./src/index.css");
});
