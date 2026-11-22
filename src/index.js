export {
  GrSwitch, GrTabs, GrDialog, GrDrawer, GrDropdown, GrPopover, GrSelect, GrContextMenu,
  GrCalendar, GrKanban, GrToastStack, GrCommandPalette, ELEMENTS, defineGr8rElements
} from "./elements.js";
export { computePlacement, dropIndex, playEffect } from "./internal.js";
export { monthMatrix, addMonths, addDays, toISODate, parseISODate } from "./calendar.js";
export { grT, formatMessage, gr8rLocales, gr8rMessages, matchGr8rLocale, registerGr8rMessages, resolveGr8rLocale } from "./i18n.js";
import { ELEMENTS } from "./elements.js";
import { isLocaleTag } from "./i18n.js";

/**
 * Set the language of a .gr-ui region (or the whole document) and refresh the built-in strings
 * of every Gr8r element inside it. Any BCP 47 tag is accepted; strings fall back to the closest
 * registered locale (see registerGr8rMessages) and Intl formatting uses the tag as given.
 */
export function applyGr8rLocale(target, locale) {
  if (!target || typeof target.setAttribute !== "function") throw new TypeError("A DOM element is required.");
  if (!isLocaleTag(locale)) throw new RangeError("Unsupported locale: " + locale);
  target.setAttribute("lang", locale);
  const selector = Object.keys(ELEMENTS).join(",");
  const elements = [target, ...(target.querySelectorAll?.(selector) || [])];
  for (const element of elements) if (typeof element.localize === "function") element.localize();
  return target;
}

export const PREFERENCE_CHOICES = Object.freeze({
  theme: Object.freeze(["light", "dark", "system"]),
  accent: Object.freeze(["indigo", "teal", "rose", "graphite"]),
  density: Object.freeze(["comfortable", "compact"]),
  motion: Object.freeze(["full", "reduce"])
});
const ATTRIBUTES = { theme: "data-gr-theme", accent: "data-gr-accent", density: "data-gr-density", motion: "data-gr-motion" };

/**
 * Update CSS design preferences on a .gr-ui wrapper (or documentElement).
 * Keeping this explicit avoids changing host application styles by surprise.
 * theme: "system" follows prefers-color-scheme in CSS, so it never flashes.
 */
export function applyGr8rPreferences(target, options = {}) {
  if (!target || typeof target.setAttribute !== "function") throw new TypeError("A DOM element is required.");
  // Validate the entire update before mutating the DOM (no partial theme changes).
  const entries = Object.entries(options);
  for (const [key, value] of entries) {
    if (!Object.hasOwn(PREFERENCE_CHOICES, key) || !PREFERENCE_CHOICES[key].includes(value)) throw new RangeError("Unsupported preference: " + key + "=" + value);
  }
  for (const [key, value] of entries) target.setAttribute(ATTRIBUTES[key], value);
  return target;
}

/** Resolve "system" to the theme currently shown ("light" | "dark"). */
export function resolveGr8rTheme(theme, media = globalThis.matchMedia) {
  if (theme === "light" || theme === "dark") return theme;
  // .call keeps window.matchMedia bound (an unbound call throws "Illegal invocation").
  return typeof media === "function" && media.call(globalThis, "(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
