import { applyGr8rLocale, applyGr8rPreferences, defineGr8rElements, parseISODate, playEffect, resolveGr8rTheme } from "../src/index.js";
import { loadState, saveState, selectTasks, resetState, isSampleSet, MAX_TASKS, STORAGE_KEY } from "./state.js";
import { setupComponentDocs, localizeDocs } from "./docs.js";
import { LOCALES, message, phrase, preferredLocale, translateTree } from "./i18n.js";

/* Capture authored markup before custom elements upgrade it. */
const boardRoot = document.querySelector("#demo-board .gr-kanban");
const boardTemplate = boardRoot?.innerHTML || "";
const chipRow = document.getElementById("chip-row");
const chipTemplate = chipRow?.innerHTML || "";
setupComponentDocs({ copy: copyText });
defineGr8rElements();

let locale = "en";
/** Message for the current gallery language. */
const t = (key, vars) => message(locale, key, vars);
/** Authored English phrase in the current language (identity for English). */
const L = english => phrase(english, locale);

const root = document.body;
const macKeys = /Mac|iPhone|iPad/.test(navigator.userAgentData?.platform || navigator.platform);
document.querySelector("#open-command .gr-kbd").textContent = macKeys ? "⌘ K" : "Ctrl K";
const shell = document.getElementById("app-shell");
const sidebarButton = document.getElementById("mobile-nav");
const sidebar = document.getElementById("sidebar");
const mainArea = document.getElementById("main-content");
const navScrim = document.getElementById("nav-scrim");
const mobileNav = window.matchMedia("(max-width: 760px)");
const systemDark = window.matchMedia("(prefers-color-scheme: dark)");
const systemReduce = window.matchMedia("(prefers-reduced-motion: reduce)");
const dialog = document.getElementById("create-dialog");
const palette = document.getElementById("command-palette");
const toasts = document.getElementById("toast-stack");
const taskList = document.querySelector(".demo-task-card");
const taskForm = document.getElementById("create-task-form");
const taskRows = document.getElementById("task-rows");
const taskSearch = document.getElementById("task-search");
const taskSort = document.getElementById("task-sort");
const taskDetails = document.getElementById("task-details");
const confirmDialog = document.getElementById("confirm-dialog");
const motionSwitch = document.getElementById("motion-switch");
const board = document.getElementById("demo-board");
let storage;
try { storage = window.localStorage; } catch { /* Storage may be blocked. */ }
const browserLocale = preferredLocale(undefined, navigator.languages?.length ? navigator.languages : [navigator.language]);
const state = loadState(storage, { locale: browserLocale });
locale = preferredLocale(state.preferences.locale, [browserLocale]);
let boardLog = { key: "board.tip", vars: {} };
let showIncompleteOnly = false;
let storageWarningShown = false;
let renderTimer;
let detailTaskId = null;

const reduced = () => root.dataset.grMotion === "reduce" || systemReduce.matches;

function persist() {
  const canPersist = saveState(storage, state);
  if (!canPersist && !storageWarningShown) {
    toast(t("storage.unavailable"));
    storageWarningShown = true;
  }
  const status = document.getElementById("save-status");
  status.dataset.state = canPersist ? "saved" : "session";
  status.lastChild.textContent = t(canPersist ? "save.saved" : "save.session");
}
function savePreference(key, value) {
  state.preferences[key] = value;
  persist();
}

function toast(message, tone = "neutral", options = {}) { return toasts.push(message, { tone, ...options }); }

/* ---------------- Appearance ---------------- */
function syncThemeUi() {
  const theme = root.dataset.grTheme || "system";
  const shown = resolveGr8rTheme(theme);
  const toggle = document.getElementById("toggle-theme");
  toggle.setAttribute("aria-label", t(shown === "dark" ? "theme.toLight" : "theme.toDark"));
  toggle.querySelector("use").setAttribute("href", shown === "dark" ? "#ic-sun" : "#ic-moon");
  document.querySelector('meta[name="theme-color"]').content = shown === "dark" ? "#1b1b1a" : "#faf9f7";
  document.querySelectorAll("[data-theme]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.theme === theme))
  );
}
function setTheme(theme) {
  applyGr8rPreferences(root, { theme });
  syncThemeUi();
}
function toggleTheme() {
  const theme = resolveGr8rTheme(root.dataset.grTheme) === "dark" ? "light" : "dark";
  setTheme(theme); savePreference("theme", theme);
}
systemDark.addEventListener("change", syncThemeUi);

function setAccent(accent) {
  applyGr8rPreferences(root, { accent });
  document.querySelectorAll("[data-accent]").forEach(button =>
    button.setAttribute("aria-pressed", String(button.dataset.accent === accent))
  );
}
function setMotion(motion) {
  applyGr8rPreferences(root, { motion });
  motionSwitch.checked = motion === "reduce";
  document.getElementById("motion-hint").textContent = t(motion === "reduce" ? "motion.hint.reduce" : systemReduce.matches ? "motion.hint.system" : "motion.hint.default");
}
function applyPreferences() {
  setTheme(state.preferences.theme || "system");
  setAccent(state.preferences.accent || "indigo");
  applyGr8rPreferences(root, { density: state.preferences.density || "comfortable" });
  document.getElementById("density").value = root.dataset.grDensity;
  setMotion(state.preferences.motion || "full");
  if (state.preferences.locale && state.preferences.locale !== locale) setLocale(state.preferences.locale, { save: false });
}

/* ---------------- Mobile navigation ---------------- */
function setSidebar(open) {
  const wasOpen = shell.dataset.sidebarOpen === "true";
  const active = Boolean(open && mobileNav.matches);
  shell.dataset.sidebarOpen = String(active);
  sidebarButton.setAttribute("aria-expanded", String(active));
  sidebarButton.setAttribute("aria-label", L(active ? "Close navigation" : "Open navigation"));
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
const rowFor = id => [...taskRows.querySelectorAll("[data-task-id]")].find(row => row.dataset.taskId === id);
const CATEGORY_TAG = { Design: "gr-tag--violet", Frontend: "gr-tag--blue", QA: "gr-tag--green" };

/* ---------------- Task playground ---------------- */
function updateSummary() {
  const completed = state.tasks.filter(task => task.done).length;
  const percentage = state.tasks.length ? Math.round(completed / state.tasks.length * 100) : 0;
  document.getElementById("task-summary").textContent = t("task.summary", { done: completed, total: state.tasks.length });
  const progress = document.getElementById("task-progress");
  progress.setAttribute("aria-valuenow", String(percentage));
  progress.firstElementChild.style.setProperty("--gr-value", percentage + "%");
  return completed;
}

/** Re-render rows. `effects` maps task IDs to one-shot motion classes for the new rows. */
function updateTaskFilter(effects = {}) {
  clearTimeout(renderTimer);
  const focused = document.activeElement;
  const focusedTask = focused?.closest("[data-task-id]")?.dataset.taskId;
  const focusedAction = focused?.dataset.action;
  const visible = selectTasks(state.tasks, {
    query: taskSearch.value, incomplete: showIncompleteOnly, sort: taskSort.value, locale,
    describe: task => [t("category." + task.category), t("priority." + task.priority)]
  });
  const fragment = document.createDocumentFragment();
  for (const task of visible) {
    const row = node("div", "gr-task-row");
    row.dataset.taskId = task.id;
    row.dataset.grContextItem = task.id;
    const checkbox = node("input", "gr-checkbox demo-task-checkbox");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.dataset.action = "complete";
    checkbox.setAttribute("aria-label", t("task.complete", { title: task.title }));
    const title = node("button", "gr-task-row__title demo-task-title" + (task.done ? " demo-task-done" : ""), task.title);
    title.type = "button";
    title.dataset.action = "details";
    title.setAttribute("aria-label", t("task.details", { title: task.title }));
    title.dataset.i18nSkip = ""; // user content is never phrase-translated
    const category = node("span", "gr-tag " + (CATEGORY_TAG[task.category] || ""), t("category." + task.category));
    const priority = node("span", "gr-badge" + (task.priority === "High" ? " gr-badge--warning" : ""), t("priority." + task.priority));
    const meta = node("span", "gr-task-row__meta");
    meta.dataset.i18nSkip = "";
    meta.append(node("span", "gr-mono", task.id.startsWith("TASK-") ? t("task.newBadge") : task.id), node("span", "gr-avatar gr-avatar--lavender", task.assignee === "You" ? t("assignee.You") : task.assignee));
    const remove = node("button", "gr-icon-button demo-delete-task");
    remove.type = "button";
    remove.dataset.action = "delete";
    remove.setAttribute("aria-label", t("task.delete", { title: task.title }));
    // Static, independently authored icon. Task content is always textContent.
    remove.innerHTML = '<svg aria-hidden="true"><use href="#ic-trash"/></svg>';
    row.append(checkbox, title, category, priority, meta, remove);
    fragment.append(row);
  }
  taskRows.replaceChildren(fragment);
  const completed = updateSummary();
  document.getElementById("task-count").textContent = String(visible.length);
  document.getElementById("task-count").setAttribute("aria-label", t("task.countLabel", { visible: visible.length, total: state.tasks.length }));
  const empty = document.getElementById("task-empty");
  empty.hidden = visible.length > 0;
  document.getElementById("task-empty-title").textContent = t(!state.tasks.length ? "empty.fresh.title" : showIncompleteOnly && !taskSearch.value && completed === state.tasks.length ? "empty.caught" : "empty.noMatch.title");
  document.getElementById("task-empty-description").textContent = t(!state.tasks.length ? "empty.fresh.body" : "empty.noMatch.body");
  document.getElementById("clear-task-filters").hidden = !showIncompleteOnly && !taskSearch.value;
  const filter = document.getElementById("tasks-filter");
  filter.setAttribute("aria-pressed", String(showIncompleteOnly));
  filter.classList.toggle("is-active", showIncompleteOnly);
  // Replacing rows must not lose keyboard focus, including when a completed task is filtered out.
  if (focusedTask && focusedAction) {
    const replacement = rowFor(focusedTask)?.querySelector(`[data-action="${focusedAction}"]`);
    (replacement || filter).focus({ preventScroll: true });
  }
  for (const [id, effect] of Object.entries(effects)) playEffect(rowFor(id), effect, effect === "gr-fx-added" ? 1400 : 1100);
}

function createTask(title, priority, description) {
  const task = { id: "TASK-" + crypto.randomUUID(), title, priority, description, category: "General", assignee: "You", done: false };
  state.tasks.push(task);
  // A newly created task should not silently disappear behind search/filter state.
  taskSearch.value = "";
  showIncompleteOnly = false;
  persist();
  updateTaskFilter({ [task.id]: "gr-fx-added" });
}

function duplicateTask(task) {
  if (state.tasks.length >= MAX_TASKS) { toast(t("limit.duplicate")); return; }
  const copy = { ...task, id: "TASK-" + crypto.randomUUID(), title: (task.title + t("task.copySuffix")).slice(0, 120), done: false };
  state.tasks.splice(state.tasks.indexOf(task) + 1, 0, copy);
  persist();
  updateTaskFilter({ [copy.id]: "gr-fx-added" });
}

function setDone(task, done) {
  task.done = done;
  persist();
  const row = rowFor(task.id);
  const hides = done && showIncompleteOnly;
  if (hides && row && !reduced()) {
    // Let the completion read (check pop + strike) before the row leaves the filtered list.
    updateSummary();
    row.querySelector(".demo-task-checkbox").checked = true;
    playEffect(row, "gr-fx-done", 1100);
    renderTimer = setTimeout(() => updateTaskFilter(), 650);
  } else updateTaskFilter(done ? { [task.id]: "gr-fx-done" } : {});
  if (detailTaskId === task.id) fillTaskDetails(task);
}

function deleteTask(id) {
  const index = state.tasks.findIndex(task => task.id === id);
  if (index < 0) return;
  const [task] = state.tasks.splice(index, 1);
  persist();
  const row = rowFor(id);
  const finish = () => {
    updateTaskFilter();
    // Destructive-action recovery must not expire while the user is deciding.
    toast(t("toast.deleted", { title: task.title }), "neutral", {
      duration: 0,
      action: {
        label: t("toast.undo"),
        onClick: () => {
          if (state.tasks.length >= MAX_TASKS) { toast(t("limit.restore")); return false; }
          if (!state.tasks.some(item => item.id === task.id)) state.tasks.splice(Math.min(index, state.tasks.length), 0, task);
          persist();
          updateTaskFilter({ [task.id]: "gr-fx-added" });
          document.getElementById("tasks-filter").focus({ preventScroll: true });
          toast(t("toast.restored"), "success");
          return true;
        }
      }
    });
  };
  // A separate timer: an unrelated re-render must never swallow the Undo notification.
  if (row && !reduced()) { row.classList.add("gr-fx-leave"); setTimeout(finish, 180); }
  else finish();
}

function fillTaskDetails(task) {
  document.getElementById("detail-id").textContent = task.id.startsWith("TASK-") ? t("detail.newTask") : task.id;
  document.getElementById("detail-priority").textContent = t("detail.priority", { priority: t("priority." + task.priority) });
  document.getElementById("detail-title").textContent = task.title;
  document.getElementById("detail-description").textContent = task.description || t("detail.noDescription");
  document.getElementById("detail-status").textContent = t("detail.status", { status: t(task.done ? "detail.done" : "detail.todo"), assignee: task.assignee === "You" ? t("assignee.You") : task.assignee });
  document.getElementById("detail-status-icon").dataset.status = task.done ? "done" : "todo";
  const category = document.getElementById("detail-category");
  category.className = "gr-tag " + (CATEGORY_TAG[task.category] || "");
  category.textContent = t("category." + task.category);
  document.getElementById("detail-toggle").textContent = t(task.done ? "detail.reopen" : "detail.markComplete");
}
function showTaskDetails(task) {
  detailTaskId = task.id;
  fillTaskDetails(task);
  taskDetails.show();
}
taskDetails.addEventListener("gr-close", () => { detailTaskId = null; });
document.getElementById("detail-toggle").addEventListener("click", () => {
  const task = state.tasks.find(item => item.id === detailTaskId);
  if (task) setDone(task, !task.done);
});
document.getElementById("detail-delete").addEventListener("click", () => {
  const id = detailTaskId;
  taskDetails.close();
  if (id) deleteTask(id);
});

function resetPlayground() {
  const fresh = resetState(state, { locale });
  state.tasks = fresh.tasks;
  taskSearch.value = "";
  showIncompleteOnly = false;
  persist();
  updateTaskFilter(Object.fromEntries(state.tasks.map(task => [task.id, "gr-fx-added"])));
  toast(t("reset.done"), "success");
}

/* ---------------- Clipboard ---------------- */
function copyText(text, button) {
  if (!navigator.clipboard?.writeText) {
    toast(t("clipboard.unavailable"), "danger");
    return;
  }
  navigator.clipboard.writeText(text)
    .then(() => {
      if (button) {
        const label = button.textContent;
        button.textContent = t("clipboard.done");
        setTimeout(() => { button.textContent = label; }, 1400);
      } else toast(t("clipboard.copied"), "success");
    })
    .catch(() => toast(t("clipboard.denied"), "danger"));
}

/* ---------------- Global click wiring ---------------- */
document.addEventListener("click", event => {
  const target = event.target.closest("button, a");
  if (!target) return;
  if (target.matches("[data-theme]")) { setTheme(target.dataset.theme); savePreference("theme", target.dataset.theme); }
  if (target.matches("#toggle-theme")) toggleTheme();
  if (target.matches("#toggle-language")) setLocale(locale === "zh-CN" ? "en" : "zh-CN");
  if (target.matches("[data-locale]")) setLocale(target.dataset.locale);
  if (target.matches("[data-accent]")) { setAccent(target.dataset.accent); savePreference("accent", target.dataset.accent); }
  if (target.matches("[data-open-dialog]")) dialog.show();
  if (target.matches("[data-command], #open-command")) palette.open();
  if (target.matches("[data-copy]")) { const source = document.getElementById(target.dataset.copy); if (source) copyText(source.textContent); }
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
  if (target.matches("#reset-playground")) resetPlayground();
  if (target.matches("#view-segments button[data-view]")) activateView(target);
  if (target.matches("#open-drawer-demo")) {
    if (state.tasks[0]) showTaskDetails(state.tasks[0]); else toast(t("drawer.needTask"));
  }
  if (target.matches("#open-confirm")) confirmDialog.show();
  if (target.matches("#confirm-delete")) {
    confirmDialog.close("confirm");
    toast(t("project.deleted"), "neutral", { duration: 6000, action: { label: t("toast.undo"), onClick: () => { toast(t("project.restored"), "success"); } } });
  }
  if (target.matches("#toast-action-demo")) {
    toast(t("invite.sent"), "success", { duration: 6000, action: { label: t("invite.view"), onClick: () => { toast(t("invite.opening")); } } });
  }
  if (target.matches(".gr-chip__remove")) removeChip(target.closest(".gr-chip"));
  if (target.matches("#reset-chips")) {
    chipRow.innerHTML = chipTemplate;
    translateTree(chipRow, locale);
    chipRow.querySelectorAll(".gr-chip").forEach((chip, i) => { chip.style.setProperty("--gr-stagger", String(i)); playEffect(chip, "gr-fx-rise", 700); });
  }
  if (target.matches("#reset-board")) {
    boardRoot.innerHTML = boardTemplate;
    translateTree(boardRoot, locale);
    board.refresh();
    setBoardLog("board.reset");
  }
  if (target.matches("#motion-play")) {
    const curves = document.getElementById("motion-curves");
    const playing = curves.classList.toggle("is-playing");
    target.setAttribute("aria-pressed", String(playing));
    target.textContent = t(playing ? "motion.reverse" : "motion.play");
  }
  if (target.matches("[data-fx]")) runEffect(target.dataset.fx);
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
motionSwitch.addEventListener("gr-change", event => {
  const motion = event.detail.checked ? "reduce" : "full";
  setMotion(motion);
  savePreference("motion", motion);
});

taskList.addEventListener("change", event => {
  if (event.target.matches(".demo-task-checkbox")) {
    const task = state.tasks.find(task => task.id === event.target.closest("[data-task-id]")?.dataset.taskId);
    if (task) setDone(task, event.target.checked);
  }
});
document.getElementById("task-context").addEventListener("gr-select", event => {
  const task = state.tasks.find(item => item.id === event.detail.context);
  if (!task) return;
  if (event.detail.value === "details") showTaskDetails(task);
  else if (event.detail.value === "toggle") setDone(task, !task.done);
  else if (event.detail.value === "duplicate") duplicateTask(task);
  else if (event.detail.value === "delete") deleteTask(task.id);
});

taskSearch.addEventListener("input", () => updateTaskFilter());
taskSort.addEventListener("change", () => updateTaskFilter());
const titleInput = document.getElementById("task-title-input");
titleInput.addEventListener("input", () => {
  titleInput.setCustomValidity(titleInput.value.trim() ? "" : t("validation.title"));
  titleInput.removeAttribute("aria-invalid");
});
taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(taskForm);
  const title = String(data.get("task") || "").trim();
  if (!title) {
    titleInput.setCustomValidity(t("validation.title"));
    titleInput.setAttribute("aria-invalid", "true");
    playEffect(titleInput, "gr-fx-shake", 400);
    titleInput.reportValidity();
    return;
  }
  if (state.tasks.length >= MAX_TASKS) { toast(t("limit.create")); return; }
  createTask(title, String(data.get("priority") || "Normal"), String(data.get("description") || "").trim());
  dialog.close();
  taskForm.reset();
  titleInput.setCustomValidity("");
  toast(t("toast.created", { title }), "success");
});

/* ---------------- Component demos ---------------- */
document.addEventListener("gr-select", event => {
  if (event.target.tagName === "GR-DROPDOWN") toast(t("toast.selected", { value: L(event.detail.value) }));
});
document.addEventListener("gr-change", event => {
  if (event.target.tagName === "GR-SWITCH" && event.target !== motionSwitch) {
    toast(t(event.detail.checked ? "toast.switchOn" : "toast.switchOff", { name: event.target.getAttribute("aria-label") }));
  }
});

const pickerLabel = (kind, value) => t("picker.label", { name: t("picker." + kind), value });
const formatDue = iso => {
  const date = parseISODate(iso);
  return date ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(date) : "";
};
/** Recompute picker trigger names after a language change (labels themselves are phrase-translated). */
function localizePickers() {
  for (const popover of document.querySelectorAll("gr-popover[data-demo-picker]")) {
    const kind = popover.dataset.demoPicker;
    const trigger = popover.querySelector("[data-gr-trigger]");
    const label = trigger.querySelector("[data-picker-label]");
    if (kind === "date") label.textContent = formatDue(popover.querySelector("gr-calendar")?.value);
    trigger.setAttribute("aria-label", pickerLabel(kind, label.textContent));
  }
}
document.querySelectorAll("gr-popover[data-demo-picker]").forEach(popover => {
  const kind = popover.dataset.demoPicker;
  const trigger = popover.querySelector("[data-gr-trigger]");
  const label = trigger.querySelector("[data-picker-label]");
  popover.addEventListener("gr-select", event => {
    const option = [...popover.querySelectorAll('[role="option"]')].find(item => item.dataset.value === event.detail.value);
    const glyph = option?.querySelector(".gr-status, .gr-priority, .gr-avatar");
    const current = trigger.querySelector("[data-picker-icon]");
    if (glyph && current) {
      const clone = glyph.cloneNode(true);
      clone.setAttribute("data-picker-icon", "");
      current.replaceWith(clone);
      playEffect(clone, "demo-fx-pop", 400);
    }
    label.textContent = event.detail.label;
    trigger.setAttribute("aria-label", pickerLabel(kind, event.detail.label));
  });
  if (kind === "date") {
    popover.addEventListener("gr-change", event => {
      const text = formatDue(event.detail.value);
      if (!text) return;
      label.textContent = text;
      trigger.setAttribute("aria-label", pickerLabel("date", text));
      popover.close(true);
    });
  }
});
document.getElementById("demo-calendar")?.addEventListener("gr-change", event => {
  document.getElementById("calendar-output").textContent = event.detail.value;
});
function syncSelectOutput() {
  const project = document.querySelector('select[name="project"]')?.value;
  const view = document.querySelector('select[name="view"]')?.value;
  document.getElementById("select-output").textContent = `project=${project} · view=${view}`;
}
document.querySelectorAll('select[name="project"], select[name="view"]').forEach(select => select.addEventListener("change", syncSelectOutput));
document.getElementById("file-context")?.addEventListener("gr-select", event => {
  toast(t("toast.file", { action: L(event.detail.value), file: event.detail.context }), event.detail.value === "Delete" ? "danger" : "neutral");
});

function removeChip(chip) {
  if (!chip) return;
  const next = chip.nextElementSibling?.querySelector(".gr-chip__remove") || chip.previousElementSibling?.querySelector(".gr-chip__remove") || document.getElementById("reset-chips");
  const done = () => { chip.remove(); next?.focus({ preventScroll: true }); };
  if (reduced()) done();
  else { chip.classList.add("gr-fx-leave"); setTimeout(done, 180); }
}

function setBoardLog(key, vars = {}) {
  boardLog = { key, vars };
  const resolved = { ...vars };
  if (vars.from) resolved.from = t("column." + vars.from);
  if (vars.to) resolved.to = t("column." + vars.to);
  document.getElementById("board-log").textContent = t(key, resolved);
}
board?.addEventListener("gr-move", event => {
  const { card, from, to, index } = event.detail;
  if (to === "done" && from !== "review" && from !== "done") {
    event.preventDefault();
    toast(t("board.needsReview", { card }), "warning");
    return;
  }
  setBoardLog("board.moved", { card, from, to, position: index + 1 });
});

function runEffect(kind) {
  const row = document.getElementById("fx-row");
  const input = document.getElementById("fx-input");
  if (reduced()) { toast(t("motion.skipped")); }
  if (kind === "added") playEffect(row, "gr-fx-added", 1400);
  if (kind === "done") {
    const check = document.getElementById("fx-check");
    check.checked = !check.checked;
    row.querySelector(".gr-task-row__title").classList.toggle("demo-task-done", check.checked);
    if (check.checked) playEffect(row, "gr-fx-done", 1100);
  }
  if (kind === "shake") { input.setAttribute("aria-invalid", "true"); playEffect(input, "gr-fx-shake", 400); }
  if (kind === "leave") {
    if (reduced()) return;
    row.classList.add("gr-fx-leave");
    setTimeout(() => { row.classList.remove("gr-fx-leave"); playEffect(row, "gr-fx-added", 1400); }, 650);
  }
  if (kind === "rise") {
    [...document.getElementById("fx-stage").children].forEach((child, i) => {
      child.style.setProperty("--gr-stagger", String(i));
      playEffect(child, "gr-fx-rise", 700);
    });
  }
}

palette.addEventListener("gr-command", event => {
  const command = event.detail.command;
  if (command.startsWith("Go to ")) {
    const section = document.getElementById(command.slice(6));
    if (section) { section.scrollIntoView({ behavior: "auto" }); history.replaceState(null, "", "#" + section.id); }
  } else if (command === "Create task") dialog.show();
  else if (command === "Toggle theme") toggleTheme();
  else if (command === "Toggle reduced motion") {
    const motion = root.dataset.grMotion === "reduce" ? "full" : "reduce";
    setMotion(motion); savePreference("motion", motion);
    toast(t(motion === "reduce" ? "motion.on" : "motion.off"));
  } else if (command === "Reset playground") resetPlayground();
  else if (command === "Switch language") setLocale(locale === "zh-CN" ? "en" : "zh-CN", { announce: true });
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

/* Keep several open tabs of the gallery in sync. */
window.addEventListener("storage", event => {
  if (event.key !== STORAGE_KEY) return;
  const next = loadState(storage);
  state.tasks = next.tasks;
  state.preferences = next.preferences;
  applyPreferences();
  updateTaskFilter();
  if (next.preferences.locale && next.preferences.locale !== locale) setLocale(next.preferences.locale, { save: false });
});

const sectionLinks = [...document.querySelectorAll(".gr-sidebar a[href^='#']")];
const sectionMap = new Map(sectionLinks.map(link => [link.hash.slice(1), link]));
const linkLabel = link => [...link.childNodes].filter(child => child.nodeType === Node.TEXT_NODE).map(child => child.textContent).join("").trim();
const observer = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      sectionLinks.forEach(link => link.removeAttribute("aria-current"));
      const link = sectionMap.get(entry.target.id);
      link?.setAttribute("aria-current", "page");
      document.getElementById("current-section").textContent = (link && linkLabel(link)) || "Overview";
    }
  }
}, { root: document.getElementById("main-content"), rootMargin: "-12% 0px -70% 0px" });
for (const id of sectionMap.keys()) {
  const section = document.getElementById(id);
  if (section) observer.observe(section);
}

/* ---------------- Language ---------------- */
function syncCurrentSection() {
  const link = sectionLinks.find(item => item.getAttribute("aria-current") === "page");
  document.getElementById("current-section").textContent = (link && linkLabel(link)) || L("Overview");
}
/**
 * Switch the whole gallery between English and Simplified Chinese:
 * library elements (applyGr8rLocale), authored text (translateTree) and generated text (t()).
 */
function setLocale(next, { save = true, announce = false } = {}) {
  if (!LOCALES.includes(next)) return;
  locale = next;
  applyGr8rLocale(document.documentElement, next);
  translateTree(document.body, next);
  document.title = t("doc.title");
  document.querySelector('meta[name="description"]').content = t("doc.description");
  // Untouched sample tasks follow the language; anything the visitor edited is left alone.
  if (LOCALES.some(other => other !== next && isSampleSet(state.tasks, other))) state.tasks = resetState(state, { locale: next }).tasks;
  const toggle = document.getElementById("toggle-language");
  toggle.firstElementChild.textContent = t("lang.toggleText");
  toggle.setAttribute("lang", next === "zh-CN" ? "en" : "zh-CN");
  toggle.setAttribute("aria-label", t("lang.toggleLabel"));
  toggle.dataset.grTooltip = next === "zh-CN" ? "Switch to English" : "切换到中文";
  document.querySelectorAll("[data-locale]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.locale === next)));
  const play = document.getElementById("motion-play");
  play.textContent = t(play.getAttribute("aria-pressed") === "true" ? "motion.reverse" : "motion.play");
  localizeDocs(next);
  localizePickers();
  setBoardLog(boardLog.key, boardLog.vars);
  syncThemeUi();
  setMotion(root.dataset.grMotion || "full");
  setSidebar(shell.dataset.sidebarOpen === "true");
  syncCurrentSection();
  if (save) savePreference("locale", next); else persist();
  updateTaskFilter();
  if (detailTaskId) { const task = state.tasks.find(item => item.id === detailTaskId); if (task) fillTaskDetails(task); }
  if (announce) toast(t("lang.changed"));
  document.documentElement.classList.remove("demo-i18n-pending");
}

applyPreferences();
syncSelectOutput();
setLocale(locale, { save: false });
setSidebar(false);
