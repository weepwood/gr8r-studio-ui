/** Gallery-only state. No storage or app state is imposed on library consumers. */
export const STORAGE_KEY = "gr8r-gallery:v1";
export const MAX_TASKS = 200;
export const DEFAULT_TASKS = [
  { id: "DES-102", title: "Review typography scale", priority: "High", category: "Design", assignee: "AL", done: false, description: "Review heading sizes, line heights, and readability across breakpoints." },
  { id: "DEV-084", title: "Build reusable dropdown", priority: "Normal", category: "Frontend", assignee: "JW", done: false, description: "Include keyboard navigation, focus return, and viewport-aware positioning." },
  { id: "DES-094", title: "Define spacing tokens", priority: "Normal", category: "Design", assignee: "MK", done: true, description: "Document the spacing scale for consistent layouts." },
  { id: "QA-021", title: "QA accessible states", priority: "Low", category: "QA", assignee: "CN", done: false, description: "Check focus visibility, contrast, and reduced-motion preferences." }
];
/** The same sample tasks (same IDs and enums) written for Chinese visitors. */
export const DEFAULT_TASKS_ZH = [
  { id: "DES-102", title: "检查字号层级", priority: "High", category: "Design", assignee: "AL", done: false, description: "检查各断点下的标题字号、行高与可读性。" },
  { id: "DEV-084", title: "开发可复用下拉菜单", priority: "Normal", category: "Frontend", assignee: "JW", done: false, description: "包含键盘导航、焦点归还和视口感知定位。" },
  { id: "DES-094", title: "定义间距变量", priority: "Normal", category: "Design", assignee: "MK", done: true, description: "整理间距刻度，保证布局一致。" },
  { id: "QA-021", title: "测试无障碍状态", priority: "Low", category: "QA", assignee: "CN", done: false, description: "检查焦点可见性、对比度和减少动效偏好。" }
];
export const SAMPLE_TASKS = { en: DEFAULT_TASKS, "zh-CN": DEFAULT_TASKS_ZH };
const sampleFor = locale => SAMPLE_TASKS[locale] || DEFAULT_TASKS;
/** True when `tasks` is exactly the untouched sample set of `locale` (safe to swap on language change). */
export function isSampleSet(tasks, locale) {
  return JSON.stringify(tasks) === JSON.stringify(sampleFor(locale));
}
const choices = {
  theme: ["light", "dark", "system"], accent: ["indigo", "teal", "rose", "graphite"],
  density: ["comfortable", "compact"], motion: ["full", "reduce"], locale: ["en", "zh-CN"]
};
export const PREFERENCE_CHOICES = choices;
export function normalizeState(value, { locale = "en" } = {}) {
  const source = value && typeof value === "object" ? value : {};
  const preferences = {};
  for (const [key, allowed] of Object.entries(choices)) {
    if (allowed.includes(source.preferences?.[key])) preferences[key] = source.preferences[key];
  }
  const ids = new Set();
  const tasks = Array.isArray(source.tasks) ? source.tasks.slice(0, MAX_TASKS).flatMap(task => {
    if (!task || typeof task.id !== "string" || !task.id || task.id.length > 80 || ids.has(task.id) || typeof task.title !== "string" || !task.title.trim()) return [];
    ids.add(task.id);
    return [{
      id: task.id, title: task.title.trim().slice(0, 120),
      priority: ["High", "Normal", "Low"].includes(task.priority) ? task.priority : "Normal",
      done: task.done === true,
      category: ["Design", "Frontend", "QA"].includes(task.category) ? task.category : "General",
      assignee: ["AL", "JW", "MK", "CN"].includes(task.assignee) ? task.assignee : "You",
      description: typeof task.description === "string" ? task.description.slice(0, 2000) : ""
    }];
  }) : sampleFor(locale).map(task => ({ ...task }));
  return { preferences, tasks };
}
export function loadState(storage, options = {}) {
  let parsed = null;
  try { parsed = JSON.parse(storage.getItem(STORAGE_KEY)); } catch { /* blocked or corrupt */ }
  // A saved language wins over the caller's guess when choosing first-run sample tasks.
  const saved = parsed?.preferences?.locale;
  return normalizeState(parsed, { locale: choices.locale.includes(saved) ? saved : options.locale });
}
export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function selectTasks(tasks, { query = "", incomplete = false, sort = "default", locale, describe } = {}) {
  const term = query.trim().toLocaleLowerCase();
  // `describe` adds displayed (e.g. translated) labels so people can search what they see.
  const result = tasks.filter(task => (!incomplete || !task.done) &&
    [task.title, task.id, task.category, task.description, ...(describe?.(task) || [])].some(text => String(text).toLocaleLowerCase().includes(term)));
  const ranks = { High: 0, Normal: 1, Low: 2 };
  if (sort === "priority") result.sort((a, b) => ranks[a.priority] - ranks[b.priority]);
  if (sort === "title") result.sort((a, b) => a.title.localeCompare(b.title, locale));
  return result;
}
/** Fresh sample data for "Reset playground"; preferences are kept unless asked otherwise. */
export function resetState(state, { keepPreferences = true, locale = "en" } = {}) {
  const next = normalizeState(null, { locale });
  if (keepPreferences) next.preferences = { ...state.preferences };
  return next;
}
