/**
 * Independent, framework-neutral interaction primitives.
 * The component DOM remains in the light tree so regular CSS and app events work.
 */
const ElementBase = typeof HTMLElement === "undefined" ? class {} : HTMLElement;

function emit(host, name, detail) {
  host.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
}

export class GrSwitch extends ElementBase {
  static get observedAttributes() { return ["checked", "disabled"]; }
  connectedCallback() {
    if (!this.button) {
      this.button = this.querySelector("button") ?? document.createElement("button");
      if (!this.button.isConnected) this.append(this.button);
      this.button.type = "button";
      this.button.classList.add("gr-switch-button");
      this.button.setAttribute("role", "switch");
      this.button.setAttribute("aria-label", this.getAttribute("aria-label") || "Toggle");
      this._click = () => {
        if (!this.hasAttribute("disabled")) {
          this.checked = !this.checked;
          emit(this, "gr-change", { checked: this.checked });
        }
      };
      this.button.addEventListener("click", this._click);
    }
    this.sync();
  }
  disconnectedCallback() { this.button?.removeEventListener("click", this._click); this.button = null; }
  attributeChangedCallback() { this.sync(); }
  get checked() { return this.hasAttribute("checked"); }
  set checked(next) { this.toggleAttribute("checked", Boolean(next)); }
  sync() {
    if (!this.button) return;
    this.button.setAttribute("aria-checked", String(this.checked));
    this.button.disabled = this.hasAttribute("disabled");
  }
}

export class GrTabs extends ElementBase {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
    this._click = event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab && this.contains(tab) && !tab.disabled) this.activate(tab, true);
    };
    this._keys = event => {
      const current = event.target.closest('[role="tab"]');
      if (!current || !this.contains(current)) return;
      const enabled = this.tabs.filter(tab => !tab.disabled);
      const i = enabled.indexOf(current);
      let next = i;
      if (event.key === "ArrowRight") next = (i + 1) % enabled.length;
      else if (event.key === "ArrowLeft") next = (i - 1 + enabled.length) % enabled.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = enabled.length - 1;
      else return;
      event.preventDefault();
      enabled[next]?.focus();
      if (enabled[next]) this.activate(enabled[next], true);
    };
    this.addEventListener("click", this._click);
    this.addEventListener("keydown", this._keys);
    const selected = this.tabs.find(tab => tab.getAttribute("aria-selected") === "true" && !tab.disabled) || this.tabs.find(tab => !tab.disabled);
    if (selected) this.activate(selected, false);
  }
  disconnectedCallback() {
    this.removeEventListener("click", this._click);
    this.removeEventListener("keydown", this._keys);
  }
  activate(next, notify = true) {
    if (!next || next.disabled) return;
    for (const tab of this.tabs) {
      const selected = tab === next;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
      const panel = this.panels.find(item => item.id === tab.getAttribute("aria-controls"));
      if (panel) panel.hidden = !selected;
    }
    if (notify) emit(this, "gr-change", { tab: next.id || next.textContent.trim() });
  }
}

export class GrDialog extends ElementBase {
  connectedCallback() {
    this.dialog = this.querySelector("dialog");
    if (!this.dialog) return;
    this._click = event => {
      if (event.target.closest("[data-gr-close]") || event.target === this.dialog) this.close();
    };
    this._closed = () => {
      this._previousFocus?.focus?.({ preventScroll: true });
      emit(this, "gr-close", {});
    };
    this.dialog.addEventListener("click", this._click);
    this.dialog.addEventListener("close", this._closed);
  }
  disconnectedCallback() {
    this.dialog?.removeEventListener("click", this._click);
    this.dialog?.removeEventListener("close", this._closed);
  }
  show() {
    if (!this.dialog || this.dialog.open) return;
    this._previousFocus = document.activeElement;
    this.dialog.showModal();
    emit(this, "gr-open", {});
  }
  close(value) { if (this.dialog?.open) this.dialog.close(value); }
}

export class GrDropdown extends ElementBase {
  connectedCallback() {
    this.trigger = this.querySelector("[data-gr-trigger]");
    this.menu = this.querySelector('[role="menu"]');
    if (!this.trigger || !this.menu) return;
    this.trigger.setAttribute("aria-haspopup", "menu");
    this._toggle = () => this.menu.hidden ? this.open() : this.close();
    this._outside = event => { if (!this.contains(event.target)) this.close(); };
    this._keys = event => {
      if (this.menu.hidden) {
        if (event.target === this.trigger && ["ArrowDown", "Enter", " "].includes(event.key)) {
          event.preventDefault(); this.open();
        }
        return;
      }
      const items = this.items;
      const i = items.indexOf(document.activeElement);
      if (event.key === "Escape") { event.preventDefault(); this.close(true); }
      else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        items[(i + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
      } else if (event.key === "Home") { event.preventDefault(); items[0]?.focus(); }
      else if (event.key === "End") { event.preventDefault(); items[items.length - 1]?.focus(); }
      else if (event.key === "Tab") this.close();
    };
    this._select = event => {
      const item = event.target.closest('[role="menuitem"]');
      if (item && !item.disabled) {
        emit(this, "gr-select", { value: item.dataset.value || item.textContent.trim() });
        this.close(true);
      }
    };
    this.trigger.addEventListener("click", this._toggle);
    this.addEventListener("keydown", this._keys);
    this.menu.addEventListener("click", this._select);
    this.close();
  }
  disconnectedCallback() {
    this.trigger?.removeEventListener("click", this._toggle);
    this.removeEventListener("keydown", this._keys);
    this.menu?.removeEventListener("click", this._select);
    document.removeEventListener("pointerdown", this._outside, true);
  }
  get items() { return Array.from(this.menu?.querySelectorAll('[role="menuitem"]:not(:disabled)') || []); }
  open() {
    if (!this.menu) return;
    this.menu.hidden = false;
    this.trigger.setAttribute("aria-expanded", "true");
    document.addEventListener("pointerdown", this._outside, true);
    this.items[0]?.focus();
  }
  close(refocus = false) {
    if (!this.menu) return;
    this.menu.hidden = true;
    this.trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", this._outside, true);
    if (refocus) this.trigger.focus();
  }
}

export class GrToastStack extends ElementBase {
  connectedCallback() {
    this.setAttribute("aria-live", "polite");
    this.setAttribute("aria-atomic", "false");
  }
  push(message, options = {}) {
    const { tone = "neutral", duration = 4200 } = options;
    const toast = document.createElement("div");
    toast.className = "gr-toast";
    toast.dataset.tone = tone;
    toast.setAttribute("role", tone === "danger" ? "alert" : "status");
    const dot = document.createElement("span");
    dot.className = "gr-toast__dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.textContent = String(message);
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";
    close.addEventListener("click", () => toast.remove(), { once: true });
    toast.append(dot, label, close);
    this.append(toast);
    while (this.children.length > 4) this.firstElementChild.remove();
    if (duration > 0) setTimeout(() => toast.remove(), duration);
    return toast;
  }
}

export class GrCommandPalette extends ElementBase {
  connectedCallback() {
    this.dialog = this.querySelector("dialog");
    this.input = this.querySelector('input[type="search"]');
    this.list = this.querySelector(".gr-command-list");
    if (!this.dialog || !this.input || !this.list) return;
    this.commands = Array.from(this.list.querySelectorAll("[data-gr-command]"));
    this._filter = () => {
      const query = this.input.value.trim().toLocaleLowerCase();
      for (const entry of this.commands) {
        entry.hidden = !entry.textContent.toLocaleLowerCase().includes(query);
      }
      this.mark(this.visible[0]);
    };
    this._keys = event => {
      const choices = this.visible;
      const i = choices.findIndex(item => item.getAttribute("aria-selected") === "true");
      if (["ArrowDown", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        this.mark(choices[(i + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length]);
      } else if (event.key === "Enter" && event.target === this.input && choices.length) {
        event.preventDefault();
        this.choose(choices[Math.max(0, i)]);
      }
    };
    this._select = event => {
      const button = event.target.closest("[data-gr-command]");
      if (button) this.choose(button);
    };
    this.input.addEventListener("input", this._filter);
    this.dialog.addEventListener("keydown", this._keys);
    this.list.addEventListener("click", this._select);
    this._dialogClick = event => { if (event.target === this.dialog) this.close(); };
    this.dialog.addEventListener("click", this._dialogClick);
  }
  disconnectedCallback() {
    this.input?.removeEventListener("input", this._filter);
    this.dialog?.removeEventListener("keydown", this._keys);
    this.list?.removeEventListener("click", this._select);
    this.dialog?.removeEventListener("click", this._dialogClick);
  }
  get visible() { return (this.commands || []).filter(entry => !entry.hidden); }
  mark(item) {
    for (const entry of this.commands || []) entry.setAttribute("aria-selected", String(entry === item));
  }
  choose(button) {
    if (!button) return;
    emit(this, "gr-command", { command: button.dataset.grCommand || button.textContent.trim() });
    this.close();
  }
  open() {
    if (!this.dialog || this.dialog.open) return;
    this.dialog.showModal();
    this.input.value = "";
    this._filter();
    this.input.focus();
  }
  close() { if (this.dialog?.open) this.dialog.close(); }
}

export const ELEMENTS = {
  "gr-switch": GrSwitch,
  "gr-tabs": GrTabs,
  "gr-dialog": GrDialog,
  "gr-dropdown": GrDropdown,
  "gr-toast-stack": GrToastStack,
  "gr-command-palette": GrCommandPalette
};

export function defineGr8rElements(registry = globalThis.customElements) {
  if (!registry) return;
  for (const [name, constructor] of Object.entries(ELEMENTS)) {
    if (!registry.get(name)) registry.define(name, constructor);
  }
}
