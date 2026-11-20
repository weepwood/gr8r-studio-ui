import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { GrCommandPalette, GrSwitch } from "../src/index.js";

const load = path => readFile(new URL(path, import.meta.url), "utf8");
function token(block, name) {
  const match = block.match(new RegExp(name + ":\\s*(#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?)"));
  assert.ok(match, "Missing color token " + name);
  return match[1];
}
function luminance(hex) {
  if (hex.length === 4) hex = "#" + [...hex.slice(1)].map(x => x + x).join("");
  return [1, 3, 5].reduce((result, pos, i) => {
    const c = parseInt(hex.slice(pos, pos + 2), 16) / 255;
    const linear = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    return result + linear * [0.2126, 0.7152, 0.0722][i];
  }, 0);
}
function ratio(foreground, background) {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
test("semantic text contrast is >= 4.5:1 for both theme surfaces", async () => {
  const css = await load("../src/tokens.css");
  const light = css.split(':root[data-gr-theme="dark"]')[0];
  const dark = css.split(':root[data-gr-theme="dark"]')[1].split(':root[data-gr-accent="teal"]')[0];
  const targets = ["--gr-ink-secondary", "--gr-ink-muted", "--gr-accent", "--gr-good", "--gr-caution", "--gr-danger", "--gr-info", "--gr-violet"];
  for (const [theme, block] of [["light", light], ["dark", dark]]) {
    const surface = token(block, "--gr-surface");
    for (const name of targets) {
      const actual = ratio(token(block, name), surface);
      assert.ok(actual >= 4.5, theme + " " + name + " has insufficient contrast: " + actual.toFixed(2));
    }
    assert.ok(ratio(token(block, "--gr-control-line"), surface) >= 3, theme + " control border contrast");
  }
});
test("switch synchronizes its state and accessible label", () => {
  const attrs = new Map([["aria-label", "Notifications"]]);
  const buttonAttrs = new Map();
  const element = Object.create(GrSwitch.prototype);
  element.hasAttribute = key => attrs.has(key);
  element.getAttribute = key => attrs.get(key) ?? null;
  element.toggleAttribute = (key, present) => present ? attrs.set(key, "") : attrs.delete(key);
  element.button = { disabled: false, setAttribute: (key, value) => buttonAttrs.set(key, value) };
  element.checked = true;
  element.sync();
  assert.equal(buttonAttrs.get("aria-checked"), "true");
  assert.equal(buttonAttrs.get("aria-label"), "Notifications");
  attrs.set("disabled", "");
  element.sync();
  assert.equal(element.button.disabled, true);
});
test("command palette keeps the combobox active descendant in sync", () => {
  const option = id => {
    const attrs = new Map();
    return { id, attrs, setAttribute: (key, value) => attrs.set(key, value) };
  };
  const a = option("a"), b = option("b"), inputAttrs = new Map();
  const input = { setAttribute: (key, value) => inputAttrs.set(key, value), removeAttribute: key => inputAttrs.delete(key) };
  const state = { commands: [a, b], input };
  GrCommandPalette.prototype.mark.call(state, b);
  assert.equal(inputAttrs.get("aria-activedescendant"), "b");
  assert.equal(a.attrs.get("aria-selected"), "false");
  assert.equal(b.attrs.get("aria-selected"), "true");
  GrCommandPalette.prototype.mark.call(state, null);
  assert.equal(inputAttrs.has("aria-activedescendant"), false);
});
test("command palette closes before dispatching a new action", () => {
  const order = [];
  GrCommandPalette.prototype.choose.call({
    close: () => order.push("close"),
    dispatchEvent: event => order.push(event.detail.command)
  }, { dataset: { grCommand: "Create task" } });
  assert.deepEqual(order, ["close", "Create task"]);
});
test("mobile navigation and segmented view controls preserve accessible state", async () => {
  const html = await load("../index.html"), js = await load("../demo/demo.js");
  assert.match(html, /id="nav-scrim"[^>]*hidden/);
  assert.match(html, /id="tasks-filter"[^>]*aria-pressed="false"/);
  assert.match(html, /id="task-count"[^>]*aria-live="polite"/);
  for (const view of ["list", "board", "calendar"]) {
    assert.ok(html.includes('id="view-preview-' + view + '"'));
    assert.ok(html.includes('data-view="' + view + '"'));
  }
  assert.ok(js.includes("mainArea.inert = active"));
  assert.ok(js.includes("sidebar.inert = mobileNav.matches && !active"));
  assert.ok(js.includes('event.key === "Escape"'));
  assert.ok(!js.includes("target.textContent = showIncompleteOnly"));
});
test("interactive motion avoids high-frequency animation and respects accessibility", async () => {
  const styles = await load("../src/components.css");
  const tokens = await load("../src/tokens.css");
  const elements = await load("../src/elements.js");
  assert.ok(styles.includes("@media (hover: hover) and (pointer: fine)"));
  assert.ok(styles.includes("@media (prefers-reduced-motion: reduce)"));
  assert.ok(tokens.includes("--gr-motion-panel: 0ms"));
  assert.ok(styles.includes('gr-toast[data-state="leaving"]'));
  assert.ok(!styles.includes("@keyframes gr-toast-in"));
  assert.ok(!styles.includes("transition: all"));
  assert.ok(elements.includes('addEventListener("focusin", pause)'));
  assert.ok(elements.includes('addEventListener("pointerenter"'));
  assert.ok(elements.includes('"role", "combobox"'));
});
