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
  for (const [key, value] of Object.entries(options)) {
    if (!(key in valid) || !valid[key].includes(value)) throw new RangeError("Unsupported preference: " + key + "=" + value);
    target.setAttribute(mapping[key], value);
  }
  return target;
}
