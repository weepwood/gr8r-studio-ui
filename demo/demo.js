import { applyGr8rPreferences, defineGr8rElements } from "../src/index.js";

defineGr8rElements();

const root = document.body;
const shell = document.getElementById("app-shell");
const sidebarButton = document.getElementById("mobile-nav");
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
  shell.dataset.sidebarOpen = String(open);
  sidebarButton.setAttribute("aria-expanded", String(open));
}

function updateTaskFilter() {
  taskList.querySelectorAll(".gr-task-row").forEach(row => {
    const done = row.querySelector(".demo-task-checkbox")?.checked;
    row.hidden = showIncompleteOnly && done;
    row.querySelector(".gr-task-row__title")?.classList.toggle("demo-task-done", Boolean(done));
  });
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
  const count = taskList.querySelectorAll(".gr-task-row").length;
  taskList.querySelector(".gr-card__header .gr-badge").textContent = String(count);
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
  if (target.closest(".gr-sidebar") && target.matches("a[href^='#']")) setSidebar(false);
  if (target.matches("#tasks-filter")) {
    showIncompleteOnly = !showIncompleteOnly;
    target.textContent = showIncompleteOnly ? "Show all" : "Incomplete only";
    updateTaskFilter();
  }
  if (target.closest("#view-segments")) {
    document.querySelectorAll("#view-segments button").forEach(button =>
      button.setAttribute("aria-pressed", String(button === target))
    );
    toast(target.textContent.trim() + " view selected");
  }
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
  if (sections[command]) document.getElementById(sections[command]).scrollIntoView({ behavior: "smooth" });
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
  if (event.key === "Escape") setSidebar(false);
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
updateTaskFilter();
