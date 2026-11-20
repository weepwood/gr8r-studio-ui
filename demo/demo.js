import { applyGr8rPreferences, defineGr8rElements } from "../src/index.js";

defineGr8rElements();

const root = document.body;
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
let showIncompleteOnly = false;

function toast(message, tone = "neutral") { toasts.push(message, { tone }); }

function setTheme(theme) {
  applyGr8rPreferences(root, { theme });
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
  sidebarButton.setAttribute("aria-label", active ? "关闭侧边导航" : "打开侧边导航");
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

function updateTaskFilter() {
  const rows = Array.from(taskList.querySelectorAll(".gr-task-row"));
  for (const row of rows) {
    const done = Boolean(row.querySelector(".demo-task-checkbox")?.checked);
    row.hidden = showIncompleteOnly && done;
    row.querySelector(".gr-task-row__title")?.classList.toggle("demo-task-done", done);
  }
  const visible = rows.filter(row => !row.hidden).length;
  const counter = document.getElementById("task-count");
  counter.textContent = String(visible);
  counter.setAttribute("aria-label", visible + " of " + rows.length + " tasks visible");
  const filter = document.getElementById("tasks-filter");
  filter.setAttribute("aria-pressed", String(showIncompleteOnly));
  filter.classList.toggle("is-active", showIncompleteOnly);
}

function createTask(title, priority) {
  const row = document.createElement("div");
  row.className = "gr-task-row";
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "gr-checkbox demo-task-checkbox";
  checkbox.setAttribute("aria-label", "完成：" + title);
  const name = document.createElement("span");
  name.className = "gr-task-row__title";
  name.textContent = title;
  const badge = document.createElement("span");
  badge.className = "gr-badge" + (priority === "High" ? " gr-badge--warning" : "");
  badge.textContent = priority;
  const meta = document.createElement("span");
  meta.className = "gr-task-row__meta";
  meta.textContent = "NEW";
  row.append(checkbox, name, badge, meta);
  taskList.append(row);
  updateTaskFilter();
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
  if (target.matches("[data-theme]")) setTheme(target.dataset.theme);
  if (target.matches("[data-accent]")) setAccent(target.dataset.accent);
  if (target.matches("[data-open-dialog]")) dialog.show();
  if (target.matches("[data-command], #open-command")) palette.open();
  if (target.matches("[data-copy]")) copySnippet(target.dataset.copy);
  if (target.matches("[data-toast]")) toast(target.dataset.toast, target.dataset.tone || "neutral");
  if (target.matches("#mobile-nav")) setSidebar(shell.dataset.sidebarOpen !== "true");
  if (target.matches("#nav-scrim")) setSidebar(false);
  if (target.closest(".gr-sidebar") && target.matches("a[href^='#']")) setSidebar(false);
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
});

taskList.addEventListener("change", event => {
  if (event.target.matches(".demo-task-checkbox")) updateTaskFilter();
});

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(taskForm);
  const title = String(data.get("task") || "").trim();
  if (!title) return;
  createTask(title, String(data.get("priority") || "Normal"));
  dialog.close();
  taskForm.reset();
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
  const sections = {
    "Go to foundations": "foundations",
    "Go to buttons": "buttons",
    "Go to forms": "forms",
    "Go to patterns": "patterns"
  };
  if (sections[command]) document.getElementById(sections[command]).scrollIntoView({ behavior: "auto" });
  else if (command === "Create task") dialog.show();
  else if (command === "Toggle theme") setTheme(root.dataset.grTheme === "dark" ? "light" : "dark");
});

document.addEventListener("keydown", event => {
  const editable = event.target.matches("input, textarea, select, [contenteditable]");
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    if (palette.dialog?.open) palette.close();
    else palette.open();
  }
  if (!editable && event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
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
      sectionMap.get(entry.target.id)?.setAttribute("aria-current", "page");
    }
  }
}, { root: document.getElementById("main-content"), rootMargin: "-12% 0px -70% 0px" });
for (const id of sectionMap.keys()) {
  const section = document.getElementById(id);
  if (section) observer.observe(section);
}

setTheme("light");
setAccent("indigo");
setSidebar(false);
updateTaskFilter();
