/**
 * Gallery documentation layer: every card marked `data-demo-code` gets
 * Preview / Code / API views. The code is captured from the authored markup
 * *before* custom elements upgrade, so the snippet is exactly what a consumer writes.
 */
const VOID = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
// Gallery-only wiring that would be noise in a copy-paste snippet.
const DROP = /^(data-toast|data-tone|data-open-dialog|data-command|data-copy|data-demo(-[\w-]+)?|data-motion-demo|data-fx)$/;

export const API = {
  "gr-switch": {
    summary: "Accessible on/off switch. Renders a role=\"switch\" button inside the element.",
    attributes: [["checked", "Boolean. Current state."], ["disabled", "Boolean."], ["aria-label", "Required accessible name."]],
    events: [["gr-change", "{ checked: boolean }"]],
    methods: [["checked", "Property (get / set)."]]
  },
  "gr-tabs": {
    summary: "Tabs with roving focus and a sliding indicator. Nested gr-tabs are isolated.",
    attributes: [["role=\"tab\" aria-controls", "Each tab points at its panel ID."]],
    events: [["gr-change", "{ tab: string }"]],
    methods: [["activate(tab, notify = true)", "Select a tab programmatically."]]
  },
  "gr-dropdown": {
    summary: "Action menu. Trigger needs data-gr-trigger; menu needs role=\"menu\" and role=\"menuitem\" children.",
    attributes: [["data-value (item)", "Value reported in gr-select."], ["aria-disabled (item)", "Skipped by keyboard."]],
    events: [["gr-select", "{ value: string }"]],
    methods: [["open()", ""], ["close(refocus?)", ""]]
  },
  "gr-popover": {
    summary: "Anchored panel in the top layer. With a role=\"listbox\" inside it becomes a picker (status, priority, assignee…).",
    attributes: [["placement", "bottom-start | bottom-end | bottom-center | top-*"], ["keep-open", "Don't close after a pick."], ["data-gr-filter (input)", "Filters options as you type."], ["aria-multiselectable (listbox)", "Toggle several options."]],
    events: [["gr-select", "{ value, label, selected } — cancelable"], ["gr-open / gr-close", ""]],
    methods: [["open()", ""], ["close(refocus = true)", ""], ["reposition()", ""]]
  },
  "gr-select": {
    summary: "Styles a native <select> as a design-system listbox. The native element stays the source of truth (forms, value, change).",
    attributes: [["data-gr-color (option)", "Shows a colour dot, e.g. var(--gr-good)."], ["placement", "Listbox placement."]],
    events: [["change / input", "Fired on the native select."], ["gr-change", "{ value: string }"]],
    methods: [["open() / close()", ""], ["build()", "Re-read options (automatic via MutationObserver)."]]
  },
  "gr-context-menu": {
    summary: "Right-click, ContextMenu key or Shift+F10 opens a menu at the pointer / focused item.",
    attributes: [["data-gr-context-target", "Region that listens (defaults to the element)."], ["data-gr-context-item", "Key reported as context."]],
    events: [["gr-select", "{ value, context }"], ["gr-open / gr-close", ""]],
    methods: [["openAt(rect, source)", ""], ["close(refocus = true)", ""]]
  },
  "gr-calendar": {
    summary: "Month grid date picker. Arrows move by day/week, PageUp/PageDown by month (Shift: year).",
    attributes: [["value", "YYYY-MM-DD"], ["min / max", "YYYY-MM-DD bounds"], ["week-start", "0 (Sun) – 6; default 1 (Mon)"], ["lang (ancestor)", "Locale for month and weekday names."]],
    events: [["gr-change", "{ value: \"YYYY-MM-DD\" }"]],
    methods: [["value", "Property (get / set)."]]
  },
  "gr-kanban": {
    summary: "Drag-and-drop board with a full keyboard alternative and live announcements.",
    attributes: [["data-gr-column", "Column key."], ["data-gr-list", "Card container inside a column."], ["data-gr-card", "Card key."], ["data-gr-count", "Auto-updated count."], ["data-gr-handle", "Optional drag handle."]],
    events: [["gr-move", "{ card, from, to, index, fromIndex } — preventDefault() reverts"]],
    methods: [["refresh()", "Re-scan after adding/removing cards."]]
  },
  "gr-dialog": {
    summary: "Native modal <dialog> with backdrop click, Escape and focus return.",
    attributes: [["data-gr-close", "Any descendant that closes the dialog."]],
    events: [["gr-open / gr-close", ""]],
    methods: [["show()", ""], ["close(value?)", ""]]
  },
  "gr-drawer": {
    summary: "Modal side sheet with the same API as gr-dialog.",
    attributes: [["side", "end (default) | start"]],
    events: [["gr-open / gr-close", ""]],
    methods: [["show()", ""], ["close(value?)", ""]]
  },
  "gr-toast-stack": {
    summary: "Polite live region for notifications. Hover or focus pauses the countdown.",
    attributes: [],
    events: [],
    methods: [["push(message, { tone, duration, action })", "tone: neutral | success | warning | danger; duration 0 = sticky; action: { label, onClick }"]]
  },
  "gr-command-palette": {
    summary: "Combobox + listbox command menu in a native dialog.",
    attributes: [["data-gr-command (button)", "Command id."]],
    events: [["gr-command", "{ command: string }"]],
    methods: [["open()", ""], ["close()", ""]]
  }
};

import { message, phrase } from "./i18n.js";

const escapeText = text => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escapeAttr = text => escapeText(text).replace(/"/g, "&quot;");

function attributes(element) {
  return Array.from(element.attributes)
    .filter(attribute => !DROP.test(attribute.name))
    .map(attribute => attribute.value === "" ? ` ${attribute.name}` : ` ${attribute.name}="${escapeAttr(attribute.value)}"`)
    .join("");
}
function inline(node) {
  if (node.nodeType === Node.TEXT_NODE) return escapeText(node.textContent.replace(/\s+/g, " "));
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const tag = node.localName;
  if (VOID.has(tag)) return `<${tag}${attributes(node)}>`;
  if (tag === "use") return `<use${attributes(node)}/>`;
  const inner = Array.from(node.childNodes).map(inline).join("").replace(/^\s+|\s+$/g, "");
  return `<${tag}${attributes(node)}>${inner}</${tag}>`;
}
function format(node, depth = 0) {
  const pad = "  ".repeat(depth);
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent.replace(/\s+/g, " ").trim();
    return text ? [pad + escapeText(text)] : [];
  }
  if (node.nodeType !== Node.ELEMENT_NODE || node.hasAttribute("data-demo-skip")) return [];
  const one = inline(node);
  const children = Array.from(node.childNodes).filter(child => child.nodeType === Node.ELEMENT_NODE || (child.nodeType === Node.TEXT_NODE && child.textContent.trim()));
  const hasElements = children.some(child => child.nodeType === Node.ELEMENT_NODE);
  if (pad.length + one.length <= 100 || !hasElements || VOID.has(node.localName) || node.localName === "svg") return [pad + one];
  return [`${pad}<${node.localName}${attributes(node)}>`, ...children.flatMap(child => format(child, depth + 1)), `${pad}</${node.localName}>`];
}
export function snippetFor(nodes) {
  return nodes.flatMap(node => format(node)).join("\n");
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function apiView(snippetRoot, code) {
  const wrap = el("div", "demo-api");
  const tags = Object.keys(API).filter(tag => snippetRoot.some(node => node.matches?.(tag) || node.querySelector?.(tag)));
  // Only real class attributes (not data-gr-* hooks).
  const classes = [...new Set([...code.matchAll(/\sclass="([^"]*)"/g)].flatMap(match => match[1].split(/\s+/)))]
    .filter(name => name.startsWith("gr-")).sort();
  if (classes.length) {
    const block = el("div", "demo-api__block");
    block.append(el("h4", "", "CSS classes"));
    const list = el("div", "demo-api__classes");
    for (const name of classes) list.append(el("code", "", "." + name));
    block.append(list);
    wrap.append(block);
  }
  for (const tag of tags) {
    const doc = API[tag];
    const block = el("div", "demo-api__block");
    block.append(el("h4", "", `<${tag}>`), el("p", "", doc.summary));
    for (const [title, rows] of [["Attributes", doc.attributes], ["Events", doc.events], ["Methods & properties", doc.methods]]) {
      if (!rows.length) continue;
      const table = el("table", "gr-table demo-api__table");
      const caption = el("caption", "gr-visually-hidden");
      caption.append(tag + " ", el("span", "", title)); // the section name is translated with the page
      const head = el("thead");
      const headRow = el("tr");
      headRow.append(Object.assign(el("th", "", title), { scope: "col" }), Object.assign(el("th", "", "Details"), { scope: "col" }));
      head.append(headRow);
      const body = el("tbody");
      for (const [name, details] of rows) {
        const row = el("tr");
        const nameCell = el("td");
        nameCell.append(el("code", "", name));
        row.append(nameCell, el("td", "", details || "—"));
        body.append(row);
      }
      table.append(caption, head, body);
      const scroller = el("div", "gr-table-wrap");
      scroller.append(table);
      block.append(scroller);
    }
    wrap.append(block);
  }
  if (tags.length) wrap.append(el("p", "demo-api__note", "Web Components need defineGr8rElements() once per page."));
  return wrap;
}

/** Must run before defineGr8rElements() so snippets reflect authored markup. */
export function setupComponentDocs({ copy, locale = "en" }) {
  const cards = Array.from(document.querySelectorAll("[data-demo-code]"));
  cards.forEach((card, index) => {
    const caption = card.querySelector(":scope > .demo-card-caption");
    const parts = Array.from(card.children).filter(child => child !== caption && !child.matches(".demo-component-note, [data-demo-keep]"));
    if (!caption || !parts.length) return;
    const code = snippetFor(parts);
    const title = caption.firstChild?.textContent.trim() || "component";
    card.dataset.demoTitle = title; // authored English, used to rebuild labels per locale

    const example = el("div", "demo-example");
    example.id = `demo-example-${index}`;
    parts[0].before(example);
    example.append(...parts);

    const codeView = el("div", "demo-code-view");
    codeView.id = `demo-code-${index}`;
    codeView.hidden = true;
    const pre = el("pre", "demo-code");
    const codeEl = el("code", "", code);
    pre.append(codeEl);
    pre.tabIndex = 0;
    pre.dataset.demoLabel = "docs.html";
    const copyButton = el("button", "gr-button gr-button--secondary gr-button--sm demo-code-copy", "Copy");
    copyButton.type = "button";
    copyButton.dataset.demoLabel = "docs.copy";
    copyButton.addEventListener("click", () => copy(code, copyButton));
    codeView.append(copyButton, pre);

    const apiPanel = apiView(parts, code);
    apiPanel.id = `demo-api-${index}`;
    apiPanel.hidden = true;
    example.after(codeView, apiPanel);

    const views = [["Preview", example], ["Code", codeView], ["API", apiPanel]];
    const group = el("div", "gr-segmented demo-doc-switch");
    group.setAttribute("role", "group");
    group.dataset.demoLabel = "docs.view";
    for (const [label, panel] of views) {
      const button = el("button", "", label);
      button.type = "button";
      button.setAttribute("aria-pressed", String(label === "Preview"));
      button.setAttribute("aria-controls", panel.id);
      button.addEventListener("click", () => {
        for (const [otherLabel, otherPanel] of views) otherPanel.hidden = otherLabel !== label;
        for (const item of group.children) item.setAttribute("aria-pressed", String(item === button));
        card.dataset.demoView = label.toLowerCase();
      });
      group.append(button);
    }
    caption.append(group);
  });
  localizeDocs(locale);
}

/** Rebuild the generated accessible names in `locale` (titles come from the authored English). */
export function localizeDocs(locale) {
  for (const card of document.querySelectorAll("[data-demo-title]")) {
    const title = phrase(card.dataset.demoTitle, locale);
    for (const element of card.querySelectorAll("[data-demo-label]")) {
      element.setAttribute("aria-label", message(locale, element.dataset.demoLabel, { title }));
    }
  }
}
