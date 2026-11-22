/**
 * Independent, framework-neutral interaction primitives.
 * The component DOM remains in the light tree so regular CSS and app events work.
 */
const ElementBase = typeof HTMLElement === "undefined" ? class {} : HTMLElement;
let autoId = 0;
const nextId = prefix => `${prefix}-${++autoId}`;

function emit(host, name, detail) {
  host.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
}

export class GrSwitch extends ElementBase {
  static get observedAttributes() { return ["checked", "disabled", "aria-label"]; }
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
    this.button.setAttribute("aria-label", this.getAttribute("aria-label") || "Toggle");
    this.button.disabled = this.hasAttribute("disabled");
  }
}

export class GrTabs extends ElementBase {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('[role="tab"]')).filter(tab => tab.closest("gr-tabs") === this);
    this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]')).filter(panel => panel.closest("gr-tabs") === this);
    this._click = event => {
      const tab = event.target.closest('[role="tab"]');
      if (tab && this.tabs.includes(tab) && !tab.disabled) this.activate(tab, true);
    };
    this._keys = event => {
      const current = event.target.closest('[role="tab"]');
      if (!current || !this.tabs.includes(current)) return;
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
      const rect = this.dialog.getBoundingClientRect();
      const outside = event.target === this.dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom);
      if (event.target.closest("[data-gr-close]") || outside) this.close();
    };
    this._closed = () => {
      if (!document.querySelector("dialog[open]")) this._previousFocus?.focus?.({ preventScroll: true });
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
    this.menu.id ||= nextId("gr-menu");
    this.trigger.setAttribute("aria-controls", this.menu.id);
    this._toggle = () => this.menu.hidden ? this.open() : this.close(true);
    this._outside = event => { if (!this.contains(event.target)) this.close(); };
    this._keys = event => {
      if (this.menu.hidden) {
        if (event.target === this.trigger && ["ArrowDown", "ArrowUp"].includes(event.key)) {
          event.preventDefault(); this.open();
          if (event.key === "ArrowUp") this.items.at(-1)?.focus();
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
      else if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
        const item = items.find(option => option.textContent.trim().toLowerCase().startsWith(event.key.toLowerCase()));
        if (item) { event.preventDefault(); item.focus(); }
      }
    };
    this._select = event => {
      const item = event.target.closest('[role="menuitem"]');
      if (item && !item.disabled && item.getAttribute("aria-disabled") !== "true") {
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
  get items() { return Array.from(this.menu?.querySelectorAll('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])') || []); }
  open() {
    if (!this.menu || this.trigger.disabled || this.trigger.getAttribute("aria-disabled") === "true") return;
    this.menu.hidden = false;
    this.trigger.setAttribute("aria-expanded", "true");
    this.menu.style.transform = "";
    this.menu.style.top = "";
    this.menu.style.bottom = "";
    const rect = this.menu.getBoundingClientRect();
    const shift = Math.min(0, window.innerWidth - rect.right - 8) + Math.max(0, 8 - rect.left);
    if (shift) this.menu.style.transform = `translateX(${shift}px)`;
    if (rect.bottom > window.innerHeight - 8 && rect.top > rect.height + 8) {
      this.menu.style.top = "auto";
      this.menu.style.bottom = "calc(100% + 6px)";
    } else { this.menu.style.top = ""; this.menu.style.bottom = ""; }
    document.addEventListener("pointerdown", this._outside, true);
    this.items[0]?.focus();
  }
  close(refocus = false) {
    if (!this.menu) return;
    this.menu.hidden = true;
    this.trigger.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", this._outside, true);
    if (refocus && this.trigger.isConnected) this.trigger.focus();
  }
}

export class GrToastStack extends ElementBase {
  connectedCallback() {
    this.setAttribute("aria-live", "polite");
    this.setAttribute("aria-atomic", "false");
  }

  /**
   * Toasts enter/leave with interruptible CSS transitions.
   * Pausing on hover/focus prevents a notification from disappearing while read.
   */
  push(message, options = {}) {
    const { tone = "neutral", duration = 4200 } = options;
    const toast = document.createElement("div");
    toast.className = "gr-toast";
    toast.dataset.tone = tone;
    toast.dataset.state = "entering";
    toast.setAttribute("role", tone === "danger" ? "alert" : "status");

    const dot = document.createElement("span");
    dot.className = "gr-toast__dot";
    dot.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "gr-toast__message";
    label.textContent = String(message);
    const close = document.createElement("button");
    close.type = "button";
    close.setAttribute("aria-label", "Dismiss notification");
    close.textContent = "×";
    toast.append(dot, label, close);

    const motionOff = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer;
    let exitFallback;
    let remaining = Math.max(0, Number(duration) || 0);
    let startedAt = 0;
    let leaving = false;
    let pausedByPointer = false;

    const finish = () => {
      clearTimeout(timer);
      clearTimeout(exitFallback);
      toast.remove();
    };
    const dismiss = () => {
      if (leaving || !toast.isConnected) return;
      leaving = true;
      clearTimeout(timer);
      if (motionOff) { finish(); return; }
      toast.dataset.state = "leaving";
      // The fallback covers display changes or transition suppression by the host.
      exitFallback = setTimeout(finish, 260);
    };
    const pause = () => {
      if (leaving || !timer) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - startedAt));
    };
    const resume = () => {
      if (leaving || timer || remaining <= 0 || pausedByPointer || toast.contains(document.activeElement)) return;
      startedAt = performance.now();
      timer = setTimeout(dismiss, remaining);
    };

    toast.addEventListener("transitionend", event => {
      if (leaving && event.target === toast && event.propertyName === "opacity") finish();
    });
    toast.addEventListener("pointerenter", () => { pausedByPointer = true; pause(); });
    toast.addEventListener("pointerleave", () => { pausedByPointer = false; resume(); });
    toast.addEventListener("focusin", pause);
    toast.addEventListener("focusout", () => queueMicrotask(resume));
    close.addEventListener("click", dismiss);

    this.append(toast);
    while (this.children.length > 4) this.firstElementChild.remove();

    if (motionOff) toast.dataset.state = "visible";
    else requestAnimationFrame(() => requestAnimationFrame(() => {
      if (toast.isConnected && !leaving) toast.dataset.state = "visible";
    }));

    if (remaining > 0) resume();
    return toast;
  }
}

export class GrCommandPalette extends ElementBase {
  connectedCallback() {
    this.dialog = this.querySelector("dialog");
    this.input = this.querySelector('input[type="search"]');
    this.list = this.querySelector(".gr-command-list");
    if (!this.dialog || !this.input || !this.list) return;

    this.list.id ||= nextId("gr-command-list");
    this.list.setAttribute("role", "listbox");
    this.list.setAttribute("aria-label", "Commands");
    this.input.setAttribute("role", "combobox");
    this.input.setAttribute("aria-autocomplete", "list");
    this.input.setAttribute("aria-controls", this.list.id);
    this.input.setAttribute("aria-expanded", "false");
    this.commands = Array.from(this.list.querySelectorAll("[data-gr-command]"));
    for (const command of this.commands) {
      command.id ||= nextId("gr-command");
      command.setAttribute("role", "option");
      command.tabIndex = -1; // Keyboard focus stays in the combobox.
    }

    this.empty = this.querySelector("[data-gr-command-empty]") || document.createElement("p");
    this.empty.setAttribute("data-gr-command-empty", "");
    this.empty.className = "gr-command-empty";
    this.empty.textContent = "No matching commands";
    this.empty.hidden = true;
    this.empty.setAttribute("role", "status");
    this.list.append(this.empty);

    this._filter = () => {
      const query = this.input.value.trim().toLocaleLowerCase();
      for (const entry of this.commands) {
        entry.hidden = !entry.textContent.toLocaleLowerCase().includes(query);
      }
      this.empty.hidden = this.visible.length !== 0;
      this.mark(this.visible[0]);
    };
    this._keys = event => {
      if (event.target !== this.input) return;
      const choices = this.visible;
      const i = choices.findIndex(item => item.getAttribute("aria-selected") === "true");
      if (["ArrowDown", "ArrowUp"].includes(event.key) && choices.length) {
        event.preventDefault();
        this.mark(choices[(i + (event.key === "ArrowDown" ? 1 : -1) + choices.length) % choices.length]);
      } else if (event.key === "Enter" && choices.length) {
        event.preventDefault();
        this.choose(choices[Math.max(0, i)]);
      }
    };
    this._select = event => {
      const button = event.target.closest("[data-gr-command]");
      if (button && !button.hidden) this.choose(button);
    };
    this._dialogClick = event => {
      const rect = this.dialog.getBoundingClientRect();
      if (event.target === this.dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) this.close();
    };
    this._closed = () => this.input.setAttribute("aria-expanded", String(this.dialog.open));

    this.input.addEventListener("input", this._filter);
    this.dialog.addEventListener("keydown", this._keys);
    this.list.addEventListener("click", this._select);
    this.dialog.addEventListener("click", this._dialogClick);
    this.dialog.addEventListener("close", this._closed);
  }
  disconnectedCallback() {
    this.input?.removeEventListener("input", this._filter);
    this.dialog?.removeEventListener("keydown", this._keys);
    this.list?.removeEventListener("click", this._select);
    this.dialog?.removeEventListener("click", this._dialogClick);
    this.dialog?.removeEventListener("close", this._closed);
  }
  get visible() { return (this.commands || []).filter(entry => !entry.hidden); }
  mark(item) {
    for (const entry of this.commands || []) entry.setAttribute("aria-selected", String(entry === item));
    if (item) {
      this.input.setAttribute("aria-activedescendant", item.id);
      if (this.dialog?.open) item.scrollIntoView?.({ block: "nearest" });
    }
    else this.input.removeAttribute("aria-activedescendant");
  }
  choose(button) {
    if (!button) return;
    const command = button.dataset.grCommand || button.textContent.trim();
    this.close(); // Restore the modal stack before command handlers open another dialog.
    emit(this, "gr-command", { command });
  }
  open() {
    if (!this.dialog || this.dialog.open) return;
    this.dialog.showModal();
    this.input.setAttribute("aria-expanded", "true");
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
