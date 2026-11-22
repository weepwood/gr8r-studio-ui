import { applyGr8rPreferences, defineGr8rElements } from "../src/index.js";

import { loadState, saveState, selectTasks, MAX_TASKS } from "./state.js";

defineGr8rElements();

const root = document.body;
const macKeys = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform);
document.querySelector("#open-command .gr-kbd").textContent = macKeys ? "⌘ K" : "Ctrl K";
const shell = document.getElementById("app-shell");
const sidebarButton = document.getElementById("mobile-nav");
const sidebar = document.getElementById("sidebar");
const mainArea = document.getElementById("main-content");
const navScrim = document.getElementById("nav-scrim");
const mobileNav = window.matchMedia("(max-width: 760px)");
const dialog = document.getElementById("create-dialog");
const palette = document.getElementById("command-palette");
const toasts = document.getElementById("toast-stack");
const taskList = document.querySelector(".demo-task-card");
const taskForm = document.getElementById("create-task-form");
const taskRows = document.getElementById("task-rows");
const taskSearch = document.getElementById("task-search");
const taskSort = document.getElementById("task-sort");
const taskDetails = document.getElementById("task-details");
let storage;
try { storage = window.localStorage; } catch { /* Storage may be blocked. */ }
const state = loadState(storage);
let showIncompleteOnly = false;
let storageWarningShown = false;

function persist() {
  const canPersist = saveState(storage, state);
  if (!canPersist && !storageWarningShown) {
    toast("Local storage is unavailable. Changes will last for this visit only.");
    storageWarningShown = true;
  }
  document.getElementById("save-status").textContent = canPersist ? "Saved on this device" : "This visit only";
}
function savePreference(key, value) {
  state.preferences[key] = value;
  persist();
}

function toast(message, tone = "neutral") { toasts.push(message, { tone }); }

function setTheme(theme) {
  applyGr8rPreferences(root, { theme });
  const toggle = document.getElementById("toggle-theme");
  toggle.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
  toggle.querySelector("use").setAttribute("href", theme === "dark" ? "#ic-sun" : "#ic-moon");
  document.querySelector('meta[name="theme-color"]').content = theme === "dark" ? "#1b1b1a" : "#faf9f7";
  document.querySelectorAll("[data-theme]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme))
  );
}

function setAccent(accent) {
  applyGr8rPreferences(root, { accent });
  document.querySelectorAll("[data-accent]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.accent === accent))
  );
}

function setSidebar(open) {
  const wasOpen = shell.dataset.sidebarOpen === "true";
  const active = Boolean(open && mobileNav.matches);
  shell.dataset.sidebarOpen = String(active);
  sidebarButton.setAttribute("aria-expanded", String(active));
  sidebarButton.setAttribute("aria-label", active ? "Close navigation" : "Open navigation");
  navScrim.hidden = !active;
  sidebar.inert = mobileNav.matches && !active;
  mainArea.inert = active;
  if (active) {
    sidebar.setAttribute("role", "dialog");
    sidebar.setAttribute("aria-modal", "true");
    sidebar.querySelector("nav a")?.focus({ preventScroll: true });
  } else {
    sidebar.removeAttribute("role");
    sidebar.removeAttribute("aria-modal");
    if (wasOpen && mobileNav.matches) sidebarButton.focus({ preventScroll: true });
  }
}
mobileNav.addEventListener("change", () => setSidebar(false));

function node(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function updateTaskFilter() {
  const focused = document.activeElement;
  const focusedTask = focused?.closest("[data-task-id]")?.dataset.taskId;
  const focusedAction = focused?.dataset.action;
  const visible = selectTasks(state.tasks, { query: taskSearch.value, incomplete: showIncompleteOnly, sort: taskSort.value });
  const fragment = document.createDocumentFragment();
  for (const task of visible) {
    const row = node("div", "gr-task-row");
    row.dataset.taskId = task.id;
    const checkbox = node("input", "gr-checkbox demo-task-checkbox");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.dataset.action = "complete";
    checkbox.setAttribute("aria-label", "Complete: " + task.title);
    const title = node("button", "gr-task-row__title demo-task-title" + (task.done ? " demo-task-done" : ""), task.title);
    title.type = "button";
    title.dataset.action = "details";
    title.setAttribute("aria-label", "Task details: " + task.title);
    const category = node("span", "gr-tag " + ({ Design: "gr-tag--violet", Frontend: "gr-tag--blue", QA: "gr-tag--green" }[task.category] || ""), task.category);
    const priority = node("span", "gr-badge" + (task.priority === "High" ? " gr-badge--warning" : ""), task.priority);
    const meta = node("span", "gr-task-row__meta");
    meta.append(node("span", "gr-mono", task.id.startsWith("TASK-") ? "NEW" : task.id), node("span", "gr-avatar gr-avatar--lavender", task.assignee));
    const remove = node("button", "gr-icon-button demo-delete-task");
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.setAttribute("aria-label", "Delete task: " + task.title);
    // Static, independently authored icon. Task content is always textContent.
    remove.innerHTML = '<svg aria-hidden="true"><use href="#ic-trash"/></svg>';
    row.append(checkbox, title, category, priority, meta, remove);
    fragment.append(row);
  }
  taskRows.replaceChildren(fragment);
  const completed = state.tasks.filter(task => task.done).length;
  const percentage = state.tasks.length ? Math.round(completed / state.tasks.length * 100) : 0;
  document.getElementById("task-count").textContent = String(visible.length);
  document.getElementById("task-count").setAttribute("aria-label", `${visible.length} of ${state.tasks.length} tasks visible`);
  document.getElementById("task-summary").textContent = `${completed} of ${state.tasks.length} completed`;
  const progress = document.getElementById("task-progress");
  progress.setAttribute("aria-valuenow", String(percentage));
  progress.firstElementChild.style.setProperty("--gr-value", percentage + "%");
  const empty = document.getElementById("task-empty");
  empty.hidden = visible.length > 0;
  document.getElementById("task-empty-title").textContent = !state.tasks.length ? "A fresh start" : showIncompleteOnly && !taskSearch.value && completed === state.tasks.length ? "All caught up!" : "No matching tasks";
  document.getElementById("task-empty-description").textContent = !state.tasks.length ? "Add a task to start your next great idea." : "Try a different search or clear your filters.";
  document.getElementById("clear-task-filters").hidden = !showIncompleteOnly && !taskSearch.value;
  const filter = document.getElementById("tasks-filter");
  filter.setAttribute("aria-pressed", String(showIncompleteOnly));
  filter.classList.toggle("is-active", showIncompleteOnly);
  // Replacing rows must not lose keyboard focus, including when a completed task is filtered out.
  if (focusedTask && focusedAction) {
    const replacement = [...taskRows.querySelectorAll("[data-task-id]")].find(row => row.dataset.taskId === focusedTask)?.querySelector(`[data-action="${focusedAction}"]`);
    (replacement || filter).focus({ preventScroll: true });
  }
}

function createTask(title, priority, description) {
  state.tasks.push({ id: "TASK-" + crypto.randomUUID(), title, priority, description, category: "General", assignee: "You", done: false });
  // A newly created task should not silently disappear behind search/filter state.
  taskSearch.value = "";
  showIncompleteOnly = false;
  persist();
  updateTaskFilter();
}

function deleteTask(id) {
  const index = state.tasks.findIndex(task => task.id === id);
  if (index < 0) return;
  const [task] = state.tasks.splice(index, 1);
  persist();
  updateTaskFilter();
  // Destructive-action recovery must not expire while the user is deciding.
  const notification = toasts.push("Task deleted: " + task.title, { duration: 0 });
  const undo = node("button", "demo-toast-undo", "Undo");
  undo.type = "button";
  undo.addEventListener("click", () => {
    if (state.tasks.length >= MAX_TASKS) { toast("Task limit reached. Remove a task before restoring."); return; }
    if (!state.tasks.some(item => item.id === task.id)) state.tasks.splice(Math.min(index, state.tasks.length), 0, task);
    persist();
    updateTaskFilter();
    notification.remove();
    document.getElementById("tasks-filter").focus({ preventScroll: true });
    toast("Task restored", "success");
  });
  notification.insertBefore(undo, notification.lastElementChild);
}

function showTaskDetails(task) {
  document.getElementById("detail-id").textContent = task.id.startsWith("TASK-") ? "New task" : task.id;
  document.getElementById("detail-priority").textContent = task.priority + " priority";
  document.getElementById("detail-title").textContent = task.title;
  document.getElementById("detail-description").textContent = task.description || "No description added.";
  document.getElementById("detail-status").textContent = `${task.done ? "Completed" : "To do"} · Assigned to ${task.assignee}`;
  taskDetails.show();
}

function copySnippet(id) {
  const source = document.getElementById(id);
  if (!source) return;
  const content = source.textContent;
  if (!navigator.clipboard?.writeText) {
    toast("Clipboard API is unavailable. Select the example text to copy.", "danger");
    return;
  }
  navigator.clipboard.writeText(content)
    .then(() => toast("Code copied to clipboard", "success"))
    .catch(() => toast("Clipboard permission denied", "danger"));
}

document.addEventListener("click", event => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.matches("[data-theme]")) { setTheme(target.dataset.theme); savePreference("theme", target.dataset.theme); }
  if (target.matches("#toggle-theme")) {
    const theme = root.dataset.grTheme === "dark" ? "light" : "dark";
    setTheme(theme); savePreference("theme", theme);
  }
  if (target.matches("[data-accent]")) { setAccent(target.dataset.accent); savePreference("accent", target.dataset.accent); }
  if (target.matches("[data-open-dialog]")) dialog.show();
  if (target.matches("[data-command], #open-command")) palette.open();
  if (target.matches("[data-copy]")) copySnippet(target.dataset.copy);
  if (target.matches("[data-toast]")) toast(target.dataset.toast, target.dataset.tone || "neutral");
  if (target.matches("#mobile-nav")) setSidebar(shell.dataset.sidebarOpen !== "true");
  if (target.matches("#nav-scrim")) setSidebar(false);
  if (target.closest(".gr-sidebar") && target.matches("a[href^='#']")) setSidebar(false);
  const task = state.tasks.find(task => task.id === target.closest("[data-task-id]")?.dataset.taskId);
  if (task && target.dataset.action === "delete") deleteTask(task.id);
  if (task && target.dataset.action === "details") showTaskDetails(task);
  if (target.matches("#clear-task-filters")) {
    taskSearch.value = ""; showIncompleteOnly = false; updateTaskFilter(); taskSearch.focus();
  }
  if (target.matches("#tasks-filter")) {
    showIncompleteOnly = !showIncompleteOnly;
    updateTaskFilter();
  }
  if (target.matches("#view-segments button[data-view]")) {
    activateView(target);
  }
});

function activateView(button) {
  document.querySelectorAll("#view-segments button[data-view]").forEach(item => {
    item.setAttribute("aria-pressed", String(item === button));
    const panel = document.getElementById(item.getAttribute("aria-controls"));
    if (panel) panel.hidden = item !== button;
  });
}
document.getElementById("view-segments").addEventListener("keydown", event => {
  if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
  const options = [...document.querySelectorAll("#view-segments button[data-view]")];
  const current = options.indexOf(document.activeElement);
  if (current === -1) return;
  event.preventDefault();
  const next = options[(current + (event.key === "ArrowRight" ? 1 : -1) + options.length) % options.length];
  activateView(next);
  next.focus();
});

document.getElementById("density").addEventListener("change", event => {
  applyGr8rPreferences(root, { density: event.target.value });
  savePreference("density", event.target.value);
});

taskList.addEventListener("change", event => {
  if (event.target.matches(".demo-task-checkbox")) {
    const task = state.tasks.find(task => task.id === event.target.closest("[data-task-id]")?.dataset.taskId);
    if (task) { task.done = event.target.checked; persist(); updateTaskFilter(); }
  }
});

taskSearch.addEventListener("input", updateTaskFilter);
taskSort.addEventListener("change", updateTaskFilter);
const titleInput = document.getElementById("task-title-input");
titleInput.addEventListener("input", () => titleInput.setCustomValidity(titleInput.value.trim() ? "" : "Enter a task title, not just spaces."));
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(taskForm);
  const title = String(data.get("task") || "").trim();
  if (!title) { titleInput.setCustomValidity("Enter a task title, not just spaces."); titleInput.reportValidity(); return; }
  if (state.tasks.length >= MAX_TASKS) { toast("This playground supports up to 200 tasks. Remove a task to continue."); return; }
  createTask(title, String(data.get("priority") || "Normal"), String(data.get("description") || "").trim());
  dialog.close();
  taskForm.reset();
  titleInput.setCustomValidity("");
  toast("Task created: " + title, "success");
});

document.addEventListener("gr-select", event => {
  toast("Selected: " + event.detail.value);
});
document.addEventListener("gr-change", event => {
  if (event.target.tagName === "GR-SWITCH") {
    toast(event.target.getAttribute("aria-label") + (event.detail.checked ? " enabled" : " disabled"));
  }
});

palette.addEventListener("gr-command", event => {
  const command = event.detail.command;
  if (command.startsWith("Go to ")) {
    const section = document.getElementById(command.slice(6));
    if (section) { section.scrollIntoView({ behavior: "auto" }); history.replaceState(null, "", "#" + section.id); }
  } else if (command === "Create task") dialog.show();
  else if (command === "Toggle theme") {
    const theme = root.dataset.grTheme === "dark" ? "light" : "dark";
    setTheme(theme); savePreference("theme", theme);
  }
});

document.addEventListener("keydown", event => {
  const editable = event.target.matches("input, textarea, select, [contenteditable]");
  const modalOpen = Boolean(document.querySelector("dialog[open]"));
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (palette.dialog?.open) palette.close();
    else if (!modalOpen && shell.dataset.sidebarOpen !== "true") palette.open();
  }
  if (!editable && !modalOpen && shell.dataset.sidebarOpen !== "true" && event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    palette.open();
  }
  if (shell.dataset.sidebarOpen === "true") {
    if (event.key === "Escape") { event.preventDefault(); setSidebar(false); }
    if (event.key === "Tab") {
      const items = Array.from(sidebar.querySelectorAll('a[href], button:not([disabled])'));
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
});

const sectionLinks = [...document.querySelectorAll(".gr-sidebar a[href^='#']")];
const sectionMap = new Map(sectionLinks.map(link => [link.hash.slice(1), link]));
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      sectionLinks.forEach(link => link.removeAttribute("aria-current"));
      const link = sectionMap.get(entry.target.id);
      link?.setAttribute("aria-current", "page");
      document.getElementById("current-section").textContent = link?.textContent.replace("Start", "").trim() || "Overview";
    }
  }
}, { root: document.getElementById("main-content"), rootMargin: "-12% 0px -70% 0px" });
for (const id of sectionMap.keys()) {
  const section = document.getElementById(id);
  if (section) observer.observe(section);
}

setTheme(state.preferences.theme || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
setAccent(state.preferences.accent || "indigo");
applyGr8rPreferences(root, { density: state.preferences.density || "comfortable" });
document.getElementById("density").value = root.dataset.grDensity;
persist();
setSidebar(false);
updateTaskFilter();
