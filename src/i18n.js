/**
 * Built-in strings for the Gr8r UI elements (accessible names, empty states, live announcements).
 * Locale is resolved per element from the nearest [lang] ancestor, so different regions of a page
 * can use different languages. Add or override locales with registerGr8rMessages().
 */
const STORE = {
  en: {
    "switch.toggle": "Toggle",
    "toast.dismiss": "Dismiss notification",
    "command.list": "Commands",
    "command.empty": "No matching commands",
    "popover.empty": "No matches",
    "contextMenu.label": "Context menu",
    "calendar.previous": "Previous month",
    "calendar.next": "Next month",
    "kanban.roledescription": "draggable card",
    "kanban.hint": "Press Space to pick up a card. Use the arrow keys to move it, Space to drop, Escape to cancel.",
    "kanban.pickedUp": "Picked up {card}.",
    "kanban.pickedUpAt": "Picked up {card} in {column}, position {position}. Use arrow keys to move, Space to drop, Escape to cancel.",
    "kanban.position": "{column}, position {position} of {total}.",
    "kanban.dropped": "Dropped {card} in {column}, position {position} of {total}.",
    "kanban.droppedOriginal": "{card} dropped in its original position.",
    "kanban.cancelled": "Move cancelled. {card} returned to {column}.",
    "kanban.rejected": "{card} can't move there. It was returned to {column}."
  },
  "zh-CN": {
    "switch.toggle": "切换",
    "toast.dismiss": "关闭通知",
    "command.list": "命令",
    "command.empty": "没有匹配的命令",
    "popover.empty": "没有匹配项",
    "contextMenu.label": "右键菜单",
    "calendar.previous": "上个月",
    "calendar.next": "下个月",
    "kanban.roledescription": "可拖动卡片",
    "kanban.hint": "按 Space 拿起卡片，用方向键移动，按 Space 放下，按 Escape 取消。",
    "kanban.pickedUp": "已拿起 {card}。",
    "kanban.pickedUpAt": "已拿起 {card}，位于 {column} 第 {position} 位。用方向键移动，按 Space 放下，按 Escape 取消。",
    "kanban.position": "{column}，第 {position} 位，共 {total} 位。",
    "kanban.dropped": "已将 {card} 放入 {column}，第 {position} 位，共 {total} 位。",
    "kanban.droppedOriginal": "{card} 已放回原位。",
    "kanban.cancelled": "已取消移动，{card} 回到 {column}。",
    "kanban.rejected": "{card} 不能移到这里，已放回 {column}。"
  }
};

const TAG = /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i;
export const isLocaleTag = value => typeof value === "string" && TAG.test(value);

/** Registered locale codes, e.g. ["en", "zh-CN"]. */
export const gr8rLocales = () => Object.keys(STORE);

/** Best registered match for a BCP 47 tag: exact → same language → "en". Any zh-* maps to zh-CN. */
export function matchGr8rLocale(tag) {
  if (!isLocaleTag(tag)) return "en";
  const locales = Object.keys(STORE);
  const lower = tag.toLowerCase();
  const exact = locales.find(locale => locale.toLowerCase() === lower);
  if (exact) return exact;
  const language = lower.split("-")[0];
  if (language === "zh" && STORE["zh-CN"]) return "zh-CN";
  return locales.find(locale => locale.toLowerCase().split("-")[0] === language) || "en";
}

/** Locale for an element: nearest [lang] ancestor, then <html lang>, then "en". */
export function resolveGr8rLocale(element) {
  const own = element?.closest?.("[lang]")?.getAttribute("lang");
  const page = globalThis.document?.documentElement?.getAttribute?.("lang");
  return matchGr8rLocale(own || page || "en");
}

/** Add a locale or override strings. Unknown keys are kept, so apps can extend messages. */
export function registerGr8rMessages(locale, messages) {
  if (!isLocaleTag(locale)) throw new RangeError("Invalid locale: " + locale);
  if (!messages || typeof messages !== "object") throw new TypeError("Messages must be an object.");
  for (const [key, value] of Object.entries(messages)) {
    if (typeof value !== "string") throw new TypeError(`Message ${key} must be a string.`);
  }
  STORE[locale] = { ...(STORE[locale] || {}), ...messages };
}

/** Copy of a locale's messages (for documentation, tests or building another translation). */
export const gr8rMessages = locale => ({ ...(STORE[locale] || {}) });

export function formatMessage(template, vars = {}) {
  return String(template).replace(/\{(\w+)\}/g, (match, name) => Object.hasOwn(vars, name) ? String(vars[name]) : match);
}

/** Translate `key` for the element's locale, falling back to English and then the key itself. */
export function grT(element, key, vars) {
  const locale = resolveGr8rLocale(element);
  const template = STORE[locale]?.[key] ?? STORE.en[key] ?? key;
  return formatMessage(template, vars);
}
