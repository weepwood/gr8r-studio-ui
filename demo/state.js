/** Gallery-only state. No storage or app state is imposed on library consumers. */
export const STORAGE_KEY = "gr8r-gallery:v1";
export const MAX_TASKS = 200;
export const DEFAULT_TASKS = [
  { id: "DES-102", title: "Review typography scale", priority: "High", category: "Design", assignee: "AL", done: false, description: "Review heading sizes, line heights, and readability across breakpoints." },
  { id: "DEV-084", title: "Build reusable dropdown", priority: "Normal", category: "Frontend", assignee: "JW", done: false, description: "Include keyboard navigation, focus return, and viewport-aware positioning." },
  { id: "DES-094", title: "Define spacing tokens", priority: "Normal", category: "Design", assignee: "MK", done: true, description: "Document the spacing scale for consistent layouts." },
  { id: "QA-021", title: "QA accessible states", priority: "Low", category: "QA", assignee: "CN", done: false, description: "Check focus visibility, contrast, and reduced-motion preferences." }
];
const choices = {
  theme: ["light", "dark"], accent: ["indigo", "teal", "rose", "graphite"],
  density: ["comfortable", "compact"]
};
export function normalizeState(value) {
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
  }) : DEFAULT_TASKS.map(task => ({ ...task }));
  return { preferences, tasks };
}
export function loadState(storage) {
  try { return normalizeState(JSON.parse(storage.getItem(STORAGE_KEY))); }
  catch { return normalizeState(null); }
}
export function saveState(storage, state) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(state)); return true; }
  catch { return false; }
}
export function selectTasks(tasks, { query = "", incomplete = false, sort = "default" } = {}) {
  const term = query.trim().toLocaleLowerCase();
  const result = tasks.filter(task => (!incomplete || !task.done) &&
    [task.title, task.id, task.category, task.description].some(text => text.toLocaleLowerCase().includes(term)));
  const ranks = { High: 0, Normal: 1, Low: 2 };
  if (sort === "priority") result.sort((a, b) => ranks[a.priority] - ranks[b.priority]);
  if (sort === "title") result.sort((a, b) => a.title.localeCompare(b.title));
  return result;
}
