export {
  GrSwitch, GrTabs, GrDialog, GrDropdown, GrToastStack,
  GrCommandPalette, ELEMENTS, defineGr8rElements
} from "./elements.js";

/**
 * Update CSS design preferences on a .gr-ui wrapper (or documentElement).
 * Keeping this explicit avoids changing host application styles by surprise.
 */
export function applyGr8rPreferences(target, options = {}) {
  if (!target || typeof target.setAttribute !== "function") throw new TypeError("A DOM element is required.");
  const valid = {
    theme: ["light", "dark"],
    accent: ["indigo", "teal", "rose", "graphite"],
    density: ["comfortable", "compact"]
  };
  const mapping = { theme: "data-gr-theme", accent: "data-gr-accent", density: "data-gr-density" };
  // Validate the entire update before mutating the DOM (no partial theme changes).
  const entries = Object.entries(options);
  for (const [key, value] of entries) {
    if (!Object.hasOwn(valid, key) || !valid[key].includes(value)) throw new RangeError("Unsupported preference: " + key + "=" + value);
  }
  for (const [key, value] of entries) target.setAttribute(mapping[key], value);
  return target;
}
