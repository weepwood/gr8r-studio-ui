import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  ELEMENTS, PREFERENCE_CHOICES, applyGr8rPreferences, resolveGr8rTheme,
  computePlacement, dropIndex, monthMatrix, addMonths, addDays, toISODate, parseISODate, GrDrawer, GrDialog
} from "../src/index.js";

const load = path => readFile(new URL(path, import.meta.url), "utf8");

test("floating placement flips to the roomier side and clamps to the viewport", () => {
  const viewport = { width: 400, height: 800 };
  const low = computePlacement({ top: 700, bottom: 730, left: 20, right: 120, width: 100, height: 30 }, { width: 200, height: 150 }, viewport);
  assert.equal(low.side, "top");
  assert.equal(low.top, 700 - 6 - 150);
  const edge = computePlacement({ top: 100, bottom: 130, left: 350, right: 390, width: 40, height: 30 }, { width: 200, height: 150 }, viewport);
  assert.equal(edge.side, "bottom");
  assert.equal(edge.left, 400 - 200 - 8);
  const end = computePlacement({ top: 100, bottom: 130, left: 300, right: 390, width: 90, height: 30 }, { width: 120, height: 50 }, viewport, { placement: "bottom-end" });
  assert.equal(end.left, 270);
  const huge = computePlacement({ top: 10, bottom: 40, left: 10, right: 50, width: 40, height: 30 }, { width: 900, height: 2000 }, viewport);
  assert.equal(huge.left, 8);
  assert.equal(huge.top, 8);
});

test("kanban drop index follows the pointer against card midpoints", () => {
  assert.equal(dropIndex([], 10), 0);
  assert.equal(dropIndex([10, 30, 50], 5), 0);
  assert.equal(dropIndex([10, 30, 50], 31), 2);
  assert.equal(dropIndex([10, 30, 50], 99), 3);
});

test("calendar helpers use local dates, clamp month ends and reject impossible dates", () => {
  assert.equal(toISODate(addMonths(parseISODate("2026-01-31"), 1)), "2026-02-28");
  assert.equal(toISODate(addMonths(parseISODate("2028-01-31"), 1)), "2028-02-29");
  assert.equal(toISODate(addMonths(parseISODate("2026-03-15"), -14)), "2025-01-15");
  assert.equal(toISODate(addDays(parseISODate("2026-12-31"), 1)), "2027-01-01");
  for (const value of ["2026-02-30", "2026-13-01", "26-1-1", "", null, undefined]) assert.equal(parseISODate(value), null);
  const monday = monthMatrix(2026, 10, 1);
  assert.equal(monday.length, 6);
  assert.ok(monday.every(week => week.length === 7));
  assert.equal(monday[0][0].getDay(), 1);
  assert.equal(toISODate(monday[0][0]), "2026-10-26");
  assert.ok(monday.flat().some(day => toISODate(day) === "2026-11-30"));
  assert.equal(monthMatrix(2026, 10, 0)[0][0].getDay(), 0);
});

test("preferences accept system theme and motion, still validating the whole update", () => {
  const values = {};
  const target = { setAttribute: (name, value) => { values[name] = value; } };
  applyGr8rPreferences(target, { theme: "system", motion: "reduce" });
  assert.deepEqual(values, { "data-gr-theme": "system", "data-gr-motion": "reduce" });
  assert.throws(() => applyGr8rPreferences(target, { theme: "light", motion: "fast" }), RangeError);
  assert.equal(values["data-gr-theme"], "system");
  assert.ok(Object.isFrozen(PREFERENCE_CHOICES.theme));
  assert.equal(resolveGr8rTheme("dark"), "dark");
  assert.equal(resolveGr8rTheme("system", () => ({ matches: true })), "dark");
  assert.equal(resolveGr8rTheme("system", () => ({ matches: false })), "light");
  assert.equal(resolveGr8rTheme("system", undefined), "light");
});

test("drawer shares the dialog contract", () => {
  assert.ok(GrDrawer.prototype instanceof GrDialog);
  assert.equal(typeof GrDrawer.prototype.show, "function");
});

function luminance(hex) {
  if (hex.length === 4) hex = "#" + [...hex.slice(1)].map(x => x + x).join("");
  return [1, 3, 5].reduce((sum, pos, i) => {
    const c = parseInt(hex.slice(pos, pos + 2), 16) / 255;
    return sum + (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}
const ratio = (a, b) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const token = (block, name) => block.match(new RegExp(name + ":\\s*(#[0-9a-fA-F]{3,6})\\b"))?.[1];

test("new label hues keep 4.5:1 text contrast on light, dark and system-dark surfaces", async () => {
  const css = await load("../src/tokens.css");
  const light = css.split(':root[data-gr-theme="dark"]')[0];
  const dark = css.split(':root[data-gr-theme="dark"]')[1].split(':root[data-gr-accent="teal"]')[0];
  const system = css.split("@media (prefers-color-scheme: dark)")[1];
  assert.ok(system, "system theme block is missing");
  for (const [theme, block] of [["light", light], ["dark", dark], ["system", system]]) {
    for (const name of ["--gr-teal", "--gr-rose", "--gr-orange"]) {
      for (const bg of ["--gr-surface", "--gr-sidebar", "--gr-surface-raised"]) {
        const value = ratio(token(block, name), token(block, bg));
        assert.ok(value >= 4.5, `${theme} ${name} on ${bg}: ${value.toFixed(2)}`);
      }
    }
  }
});

test("system theme mirrors every dark colour token", async () => {
  const css = await load("../src/tokens.css");
  const dark = css.split(':root[data-gr-theme="dark"]')[1].split(':root[data-gr-accent="teal"]')[0];
  const system = css.split("@media (prefers-color-scheme: dark)")[1];
  for (const [, name, value] of dark.matchAll(/(--gr-[\w-]+):\s*(#[0-9a-fA-F]{3,6})\b/g)) {
    assert.equal(token(system, name), value, `system theme drifts from dark for ${name}`);
  }
});

test("motion effects have reduced-motion fallbacks and an in-app switch", async () => {
  const motion = await load("../src/motion.css");
  const tokens = await load("../src/tokens.css");
  for (const effect of ["gr-fx-added", "gr-fx-done", "gr-fx-land", "gr-fx-leave", "gr-fx-shake", "gr-fx-rise"]) {
    assert.ok(motion.includes("." + effect), "Missing effect " + effect);
  }
  assert.match(motion, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(motion, /\[data-gr-motion="reduce"\]/);
  assert.match(tokens, /\.gr-ui\[data-gr-motion="reduce"\]/);
  assert.ok(!motion.includes("transition: all"));
  assert.ok(!/infinite/.test(motion), "one-shot effects must not loop");
});

test("types, API docs and gallery cover every element", async () => {
  const [types, api, html] = await Promise.all([load("../src/index.d.ts"), load("../docs/api.md"), load("../index.html")]);
  for (const tag of Object.keys(ELEMENTS)) {
    assert.ok(types.includes(`"${tag}":`), "index.d.ts is missing " + tag);
    assert.ok(api.includes("## " + tag), "docs/api.md is missing a section for " + tag);
    assert.ok(html.includes("<" + tag), "gallery is missing " + tag);
  }
  assert.ok((html.match(/data-demo-code/g) || []).length >= 20, "most gallery cards should offer a Code view");
  assert.equal((html.match(/<gr-dropdown/g) || []).length, 1, "e2e relies on a single gr-dropdown");
});

test("stylesheet entry imports overlays and motion", async () => {
  const index = await load("../src/index.css");
  for (const file of ["tokens", "base", "components", "overlays", "layout", "motion"]) assert.ok(index.includes(`./${file}.css`), file);
});
