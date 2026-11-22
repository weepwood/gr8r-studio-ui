import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_TASKS, MAX_TASKS, normalizeState, loadState, saveState, selectTasks } from "../demo/state.js";
import { applyGr8rPreferences } from "../src/index.js";

test("gallery storage recovers from invalid JSON, missing storage and blocked writes", () => {
  for (const storage of [undefined, { getItem: () => "{" }, { getItem() { throw Error("blocked"); } }]) {
    assert.equal(loadState(storage).tasks.length, DEFAULT_TASKS.length);
  }
  assert.equal(saveState(undefined, {}), false);
  let saved;
  assert.equal(saveState({ setItem: (key, value) => { saved = JSON.parse(value); } }, { tasks: [] }), true);
  assert.deepEqual(saved, { tasks: [] });
});
test("stored state is validated, bounded and does not resurrect deliberately empty tasks", () => {
  const state = normalizeState({ preferences: { theme: "invalid", accent: "teal", density: "compact" }, tasks: [null, {},
    { id: "1", title: "  Task  ", done: "false", priority: "invalid", description: "x".repeat(3000) },
    { id: "1", title: "Duplicate" }, { id: "2", title: "  " }
  ] });
  assert.deepEqual(state.preferences, { accent: "teal", density: "compact" });
  assert.equal(state.tasks.length, 1);
  assert.equal(state.tasks[0].title, "Task");
  assert.equal(state.tasks[0].done, false);
  assert.equal(state.tasks[0].priority, "Normal");
  assert.equal(state.tasks[0].description.length, 2000);
  assert.deepEqual(normalizeState({ tasks: [] }).tasks, []);
  assert.equal(normalizeState({ tasks: Array.from({ length: 300 }, (_, i) => ({ id: String(i), title: "Task" })) }).tasks.length, MAX_TASKS);
});
test("default tasks are fresh objects, not shared mutable state", () => {
  const state = normalizeState(null);
  state.tasks[0].done = true;
  assert.equal(DEFAULT_TASKS[0].done, false);
});
test("task filtering combines search, status and stable priority ordering without mutation", () => {
  const original = [...DEFAULT_TASKS];
  assert.equal(selectTasks(original, { query: " DES- " }).length, 2);
  assert.equal(selectTasks(original, { incomplete: true }).length, 3);
  assert.equal(selectTasks(original, { query: "spacing", incomplete: true }).length, 0);
  assert.equal(selectTasks(original, { query: "viewport-aware" })[0].id, "DEV-084");
  assert.deepEqual(selectTasks(original, { sort: "priority" }).map(task => task.priority), ["High", "Normal", "Normal", "Low"]);
  assert.deepEqual(original, DEFAULT_TASKS);
});
test("invalid batch preferences never apply a partial update or accept inherited property names", () => {
  const calls = [];
  const target = { setAttribute: (...args) => calls.push(args) };
  assert.throws(() => applyGr8rPreferences(target, { theme: "dark", accent: "wrong" }), RangeError);
  assert.throws(() => applyGr8rPreferences(target, { toString: "dark" }), RangeError);
  assert.deepEqual(calls, []);
});

test("danger button text maintains contrast in light and dark themes", async () => {
  const { readFile } = await import("node:fs/promises");
  const css = await readFile(new URL("../src/tokens.css", import.meta.url), "utf8");
  const luminance = hex => {
    const rgb = hex.length === 4 ? [...hex.slice(1)].map(x => x + x) : hex.slice(1).match(/../g);
    return rgb.reduce((sum, v, i) => {
      const c = parseInt(v, 16) / 255;
      return sum + (c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4) * [.2126, .7152, .0722][i];
    }, 0);
  };
  const backgrounds = [...css.matchAll(/--gr-danger:\s*(#[\da-f]+)/g)];
  const foregrounds = [...css.matchAll(/--gr-danger-contrast:\s*(#[\da-f]+)/g)];
  for (let i = 0; i < backgrounds.length; i++) {
    const a = luminance(backgrounds[i][1]), b = luminance(foregrounds[i][1]);
    assert.ok((Math.max(a, b) + .05) / (Math.min(a, b) + .05) >= 4.5);
  }
});
