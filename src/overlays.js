import { ElementBase, createFloating, emit, focusables, nextId, rovingKeydown } from "./internal.js";
import { grT } from "./i18n.js";

/** Close a floating component when the pointer goes down outside it (and outside its panel). */
function outsideListener(component, isInside) {
  return event => { if (!isInside(event.target)) component.close(false); };
}
/** Keep a floating panel anchored while the page scrolls or resizes. */
function trackPosition(update) {
  let frame = 0;
  const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(update); };
  window.addEventListener("resize", schedule);
  document.addEventListener("scroll", schedule, true);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", schedule);
    document.removeEventListener("scroll", schedule, true);
  };
}

/**
 * <gr-popover placement="bottom-start">
 *   <button data-gr-trigger>Status</button>
 *   <div class="gr-popover" data-gr-panel hidden>
 *     <input data-gr-filter …>                         (optional)
 *     <div role="listbox"><button role="option" data-value="todo">To do</button>…</div>
 *   </div>
 * </gr-popover>
 * Events: gr-open, gr-close, gr-select { value, label }.
 */
export class GrPopover extends ElementBase {
  connectedCallback() {
    this.trigger = this.querySelector("[data-gr-trigger]");
    this.panel = this.querySelector("[data-gr-panel]");
    if (!this.trigger || !this.panel || this._ready) return;
    this._ready = true;
    this.panel.id ||= nextId("gr-popover");
    this.trigger.setAttribute("aria-controls", this.panel.id);
    this.trigger.setAttribute("aria-expanded", "false");
    this.listbox = this.panel.querySelector('[role="listbox"]');
    this.trigger.setAttribute("aria-haspopup", this.listbox ? "listbox" : "dialog");
    if (!this.panel.hasAttribute("role") && !this.listbox) this.panel.setAttribute("role", "dialog");
    // Only a dialog-like panel is named; a listbox panel is a plain container around the named listbox.
    if (!this.listbox && !this.panel.hasAttribute("aria-label") && !this.panel.hasAttribute("aria-labelledby")) {
      this.panel.setAttribute("aria-label", this.trigger.getAttribute("aria-label") || this.trigger.textContent.trim());
    }
    this.filter = this.panel.querySelector("[data-gr-filter]");
    this.floating = createFloating(this.panel);

    this._toggle = () => this.isOpen ? this.close(true) : this.open();
    this._outside = outsideListener(this, target => this.contains(target) || this.panel.contains(target));
    this._keys = event => this.onKey(event);
    this._pick = event => {
      const option = event.target.closest('[role="option"]');
      if (option && this.panel.contains(option)) this.choose(option);
    };
    this._filter = () => this.applyFilter();
    this.trigger.addEventListener("click", this._toggle);
    this.trigger.addEventListener("keydown", event => {
      if (!this.isOpen && ["ArrowDown", "ArrowUp"].includes(event.key) && this.listbox) { event.preventDefault(); this.open(); }
    });
    this.panel.addEventListener("keydown", this._keys);
    this.panel.addEventListener("click", this._pick);
    this.filter?.addEventListener("input", this._filter);
    this.syncSelection();
  }
  disconnectedCallback() { this.close(false); }
  localize() {
    const empty = this.panel?.querySelector("[data-gr-popover-empty]");
    if (empty) empty.textContent = grT(this, "popover.empty");
  }

  get isOpen() { return Boolean(this.floating?.open); }
  get options() {
    return Array.from(this.listbox?.querySelectorAll('[role="option"]') || [])
      .filter(option => !option.hidden && option.getAttribute("aria-disabled") !== "true" && !option.disabled);
  }

  syncSelection() {
    for (const option of this.listbox?.querySelectorAll('[role="option"]') || []) {
      option.setAttribute("aria-selected", String(option.getAttribute("aria-selected") === "true"));
      option.tabIndex = -1;
    }
  }

  open() {
    if (!this.floating || this.isOpen || this.trigger.disabled) return;
    this.floating.show();
    this.trigger.setAttribute("aria-expanded", "true");
    this.reposition();
    this._untrack = trackPosition(() => this.reposition());
    document.addEventListener("pointerdown", this._outside, true);
    if (this.filter) { this.filter.value = ""; this.applyFilter(); }
    const selected = this.options.find(option => option.getAttribute("aria-selected") === "true");
    const preferred = this.panel.querySelector('[data-gr-autofocus], [autofocus], .gr-calendar__day[tabindex="0"]');
    (this.filter || selected || this.options[0] || preferred || focusables(this.panel)[0] || this.panel).focus({ preventScroll: true });
    emit(this, "gr-open");
  }
  close(refocus = true) {
    if (!this.floating || !this.isOpen) return;
    this.floating.hide();
    this.trigger.setAttribute("aria-expanded", "false");
    this._untrack?.();
    document.removeEventListener("pointerdown", this._outside, true);
    if (refocus && this.trigger.isConnected) this.trigger.focus({ preventScroll: true });
    emit(this, "gr-close");
  }
  reposition() { if (this.isOpen) this.floating.place(this.trigger, this.getAttribute("placement") || "bottom-start"); }

  applyFilter() {
    const term = this.filter.value.trim().toLocaleLowerCase();
    let visible = 0;
    for (const option of this.listbox?.querySelectorAll('[role="option"]') || []) {
      option.hidden = Boolean(term) && !option.textContent.toLocaleLowerCase().includes(term);
      if (!option.hidden) visible++;
    }
    let empty = this.panel.querySelector("[data-gr-popover-empty]");
    if (!empty && this.listbox) {
      empty = document.createElement("p");
      empty.className = "gr-popover__empty";
      empty.setAttribute("data-gr-popover-empty", "");
      empty.setAttribute("role", "status");
      empty.textContent = grT(this, "popover.empty");
      this.listbox.after(empty);
    }
    if (empty) empty.hidden = visible > 0;
    this.reposition();
  }

  onKey(event) {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); this.close(true); return; }
    if (event.key === "Tab" && !this.listbox) {
      // Keep Tab inside a dialog-like popover; closing on Tab-out keeps the page order predictable.
      const items = focusables(this.panel);
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); this.close(true); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); this.close(true); }
      return;
    }
    if (!this.listbox) return;
    const options = this.options;
    if (event.target === this.filter) {
      if (event.key === "ArrowDown") { event.preventDefault(); options[0]?.focus(); }
      else if (event.key === "Enter") { event.preventDefault(); if (options[0]) this.choose(options[0]); }
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      const option = event.target.closest('[role="option"]');
      if (option) { event.preventDefault(); this.choose(option); }
      return;
    }
    if (event.key === "ArrowUp" && this.filter && options.indexOf(document.activeElement) === 0) {
      event.preventDefault(); this.filter.focus(); return;
    }
    rovingKeydown(event, options, { onTab: () => this.close(false) });
  }

  choose(option) {
    if (option.getAttribute("aria-disabled") === "true" || option.disabled) return;
    const multiple = this.listbox?.getAttribute("aria-multiselectable") === "true";
    if (multiple) option.setAttribute("aria-selected", String(option.getAttribute("aria-selected") !== "true"));
    else for (const item of this.listbox.querySelectorAll('[role="option"]')) item.setAttribute("aria-selected", String(item === option));
    const value = option.dataset.value ?? option.textContent.trim();
    const allowed = emit(this, "gr-select", { value, label: option.textContent.trim(), selected: option.getAttribute("aria-selected") === "true" });
    if (allowed && !multiple && !this.hasAttribute("keep-open")) this.close(true);
  }
}

/**
 * <gr-select><select class="gr-select" aria-label="Project">…</select></gr-select>
 * Enhances a native select into the design-system listbox (WAI-ARIA select-only combobox).
 * The native element stays the source of truth: forms, `value` and `change` events keep working.
 */
export class GrSelect extends ElementBase {
  connectedCallback() {
    this.select = this.querySelector("select");
    if (!this.select || this._ready || this.select.multiple) return;
    this._ready = true;
    const select = this.select;
    select.classList.add("gr-select-native");
    select.tabIndex = -1;
    select.setAttribute("aria-hidden", "true");

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "gr-select gr-select-trigger";
    this.button.setAttribute("role", "combobox");
    this.button.setAttribute("aria-haspopup", "listbox");
    this.button.setAttribute("aria-expanded", "false");
    // Name the combobox without pulling the option text into a wrapping <label>.
    const label = select.labels?.[0];
    let nameSource = null;
    if (select.getAttribute("aria-labelledby")) this.button.setAttribute("aria-labelledby", select.getAttribute("aria-labelledby"));
    else if (select.getAttribute("aria-label")) this.button.setAttribute("aria-label", select.getAttribute("aria-label"));
    else if (label) {
      nameSource = label.contains(this) ? label.querySelector(".gr-label") : label;
      if (nameSource) { nameSource.id ||= nextId("gr-select-label"); this.button.setAttribute("aria-labelledby", nameSource.id); }
      else this.button.setAttribute("aria-label", label.textContent.trim());
    }
    this.valueLabel = document.createElement("span");
    this.valueLabel.className = "gr-select-trigger__value";
    this.button.append(this.valueLabel);

    this.list = document.createElement("div");
    this.list.className = "gr-listbox";
    this.list.id = nextId("gr-listbox");
    this.list.setAttribute("role", "listbox");
    this.list.tabIndex = -1;
    if (this.button.hasAttribute("aria-labelledby")) this.list.setAttribute("aria-labelledby", this.button.getAttribute("aria-labelledby"));
    else if (this.button.hasAttribute("aria-label")) this.list.setAttribute("aria-label", this.button.getAttribute("aria-label"));
    this.button.setAttribute("aria-controls", this.list.id);
    select.after(this.button, this.list);
    this.floating = createFloating(this.list);

    this._labelClick = event => { event.preventDefault(); this.button.focus(); };
    label?.addEventListener("click", this._labelClick);
    this.button.addEventListener("click", () => this.isOpen ? this.close() : this.open());
    this.button.addEventListener("keydown", event => this.onKey(event));
    this.button.addEventListener("blur", () => { if (this.isOpen && !this._pointerInList) this.close(false); });
    this.list.addEventListener("pointerdown", () => { this._pointerInList = true; });
    this.list.addEventListener("mousedown", event => event.preventDefault()); // keep focus on the combobox
    this.list.addEventListener("pointerup", () => { this._pointerInList = false; });
    this.list.addEventListener("click", event => {
      const option = event.target.closest('[role="option"]');
      if (option && option.getAttribute("aria-disabled") !== "true") { this.commit(Number(option.dataset.index)); this.close(); }
    });
    this._outside = outsideListener(this, target => this.contains(target));
    this._native = () => this.sync();
    select.addEventListener("change", this._native);
    this._observer = new MutationObserver(() => this.build());
    // characterData: option text may be translated in place (e.g. when the page language changes).
    this._observer.observe(select, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["disabled", "label"] });
    this.build();
  }
  disconnectedCallback() { this.close(false); }

  get isOpen() { return Boolean(this.floating?.open); }
  get enabledIndexes() { return this.optionEls.filter(el => el.getAttribute("aria-disabled") !== "true").map(el => Number(el.dataset.index)); }

  build() {
    const select = this.select;
    this.optionEls = [];
    const fragment = document.createDocumentFragment();
    const addOption = (option, parent) => {
      const index = Array.prototype.indexOf.call(select.options, option);
      const item = document.createElement("div");
      item.className = "gr-listbox__option";
      item.id = `${this.list.id}-${index}`;
      item.setAttribute("role", "option");
      item.dataset.index = String(index);
      if (option.dataset.grColor) {
        const dot = document.createElement("span");
        dot.className = "gr-listbox__dot";
        dot.style.setProperty("--gr-dot", option.dataset.grColor);
        dot.setAttribute("aria-hidden", "true");
        item.append(dot);
      }
      const text = document.createElement("span");
      text.className = "gr-listbox__text";
      text.textContent = option.textContent;
      item.append(text);
      if (option.disabled || option.parentElement?.disabled) item.setAttribute("aria-disabled", "true");
      this.optionEls.push(item);
      parent.append(item);
    };
    for (const child of select.children) {
      if (child.tagName === "OPTGROUP") {
        const group = document.createElement("div");
        group.setAttribute("role", "group");
        const heading = document.createElement("div");
        heading.className = "gr-listbox__group";
        heading.id = nextId("gr-listbox-group");
        heading.textContent = child.label;
        group.setAttribute("aria-labelledby", heading.id);
        group.append(heading);
        for (const option of child.querySelectorAll("option")) addOption(option, group);
        fragment.append(group);
      } else if (child.tagName === "OPTION") addOption(child, fragment);
    }
    this.list.replaceChildren(fragment);
    this.button.disabled = select.disabled;
    this.sync();
  }

  sync() {
    const index = this.select.selectedIndex;
    const option = this.select.options[index];
    this.valueLabel.textContent = option ? option.textContent : "";
    this.valueLabel.style.removeProperty("--gr-dot");
    this.valueLabel.classList.toggle("has-dot", Boolean(option?.dataset.grColor));
    if (option?.dataset.grColor) this.valueLabel.style.setProperty("--gr-dot", option.dataset.grColor);
    for (const item of this.optionEls || []) item.setAttribute("aria-selected", String(Number(item.dataset.index) === index));
  }

  highlight(index) {
    this.active = index;
    for (const item of this.optionEls) item.classList.toggle("is-active", Number(item.dataset.index) === index);
    const item = this.optionEls.find(el => Number(el.dataset.index) === index);
    if (item) { this.button.setAttribute("aria-activedescendant", item.id); item.scrollIntoView?.({ block: "nearest" }); }
    else this.button.removeAttribute("aria-activedescendant");
  }

  open() {
    if (this.isOpen || this.select.disabled) return;
    this.floating.show();
    this.list.style.minWidth = this.button.getBoundingClientRect().width + "px";
    this.floating.place(this.button, this.getAttribute("placement") || "bottom-start");
    this.button.setAttribute("aria-expanded", "true");
    this.highlight(this.select.selectedIndex >= 0 ? this.select.selectedIndex : this.enabledIndexes[0]);
    this._untrack = trackPosition(() => this.floating.place(this.button, this.getAttribute("placement") || "bottom-start"));
    document.addEventListener("pointerdown", this._outside, true);
  }
  close(refocus = true) {
    if (!this.isOpen) return;
    this.floating.hide();
    this.button.setAttribute("aria-expanded", "false");
    this.button.removeAttribute("aria-activedescendant");
    this._untrack?.();
    document.removeEventListener("pointerdown", this._outside, true);
    if (refocus) this.button.focus({ preventScroll: true });
  }

  commit(index) {
    if (!Number.isInteger(index) || index < 0 || index === this.select.selectedIndex) { this.sync(); return; }
    this.select.selectedIndex = index;
    this.sync();
    this.select.dispatchEvent(new Event("input", { bubbles: true }));
    this.select.dispatchEvent(new Event("change", { bubbles: true }));
    emit(this, "gr-change", { value: this.select.value });
  }

  onKey(event) {
    const enabled = this.enabledIndexes;
    const pos = enabled.indexOf(this.active);
    const move = next => { event.preventDefault(); if (!this.isOpen) this.open(); this.highlight(next); };
    if (!this.isOpen) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) { event.preventDefault(); this.open(); }
      else if (event.key === "Home") move(enabled[0]);
      else if (event.key === "End") move(enabled[enabled.length - 1]);
      else this.typeahead(event);
      return;
    }
    switch (event.key) {
      case "ArrowDown": move(enabled[Math.min(pos + 1, enabled.length - 1)]); break;
      case "ArrowUp": move(enabled[Math.max(pos - 1, 0)]); break;
      case "Home": move(enabled[0]); break;
      case "End": move(enabled[enabled.length - 1]); break;
      case "PageDown": move(enabled[Math.min(pos + 10, enabled.length - 1)]); break;
      case "PageUp": move(enabled[Math.max(pos - 10, 0)]); break;
      case "Enter": case " ": event.preventDefault(); this.commit(this.active); this.close(); break;
      case "Escape": event.preventDefault(); event.stopPropagation(); this.close(); break;
      case "Tab": this.commit(this.active); this.close(false); break;
      default: this.typeahead(event);
    }
  }

  typeahead(event) {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey || event.key === " ") return;
    clearTimeout(this._typeTimer);
    this._typed = (this._typed || "") + event.key.toLocaleLowerCase();
    this._typeTimer = setTimeout(() => { this._typed = ""; }, 600);
    const enabled = this.enabledIndexes;
    const start = this._typed.length === 1 ? enabled.indexOf(this.isOpen ? this.active : this.select.selectedIndex) + 1 : enabled.indexOf(this.active);
    const ordered = enabled.slice(Math.max(start, 0)).concat(enabled.slice(0, Math.max(start, 0)));
    const match = ordered.find(index => this.select.options[index].textContent.trim().toLocaleLowerCase().startsWith(this._typed));
    if (match === undefined) return;
    event.preventDefault();
    if (this.isOpen) this.highlight(match); else this.commit(match);
  }
}

/**
 * <gr-context-menu>
 *   <div data-gr-context-target> … <div data-gr-context-item="DES-102" tabindex="0">…</div> … </div>
 *   <div class="gr-menu" role="menu" hidden><button role="menuitem" data-value="open">Open</button>…</div>
 * </gr-context-menu>
 * Opens on right-click, the ContextMenu key or Shift+F10. Event: gr-select { value, context }.
 */
export class GrContextMenu extends ElementBase {
  connectedCallback() {
    this.menu = this.querySelector(':scope > [role="menu"]') || this.querySelector('[role="menu"]');
    this.target = this.querySelector("[data-gr-context-target]") || this;
    if (!this.menu || this._ready) return;
    this._ready = true;
    this.menu.id ||= nextId("gr-context-menu");
    if (!this.menu.hasAttribute("aria-label")) { this._autoLabel = true; this.menu.setAttribute("aria-label", grT(this, "contextMenu.label")); }
    this.floating = createFloating(this.menu);
    for (const item of this.menu.querySelectorAll('[role="menuitem"]')) item.tabIndex = -1;

    this._context = event => {
      if (this.menu.contains(event.target)) return;
      event.preventDefault();
      // Shift+F10 may also synthesize a contextmenu event after we opened from keydown.
      if (this.isOpen) return;
      const rect = { top: event.clientY, bottom: event.clientY, left: event.clientX, right: event.clientX, width: 0, height: 0 };
      this.openAt(rect, event.target);
    };
    this._keyOpen = event => {
      if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        event.preventDefault();
        const source = event.target.closest("[data-gr-context-item]") || event.target;
        this.openAt(source.getBoundingClientRect(), source);
      }
    };
    this._keys = event => rovingKeydown(event, this.items, { onEscape: () => this.close(true), onTab: () => this.close(false) });
    this._pick = event => {
      const item = event.target.closest('[role="menuitem"]');
      if (!item || item.disabled || item.getAttribute("aria-disabled") === "true") return;
      const context = this.source?.closest?.("[data-gr-context-item]")?.dataset.grContextItem ?? null;
      this.close(true);
      emit(this, "gr-select", { value: item.dataset.value || item.textContent.trim(), context });
    };
    this._outside = outsideListener(this, target => this.menu.contains(target));
    this.target.addEventListener("contextmenu", this._context);
    // A keyboard-invoked contextmenu (e.g. the Windows menu key on keyup) lands on our open menu.
    this.menu.addEventListener("contextmenu", event => event.preventDefault());
    this.target.addEventListener("keydown", this._keyOpen);
    this.menu.addEventListener("keydown", this._keys);
    this.menu.addEventListener("click", this._pick);
  }
  disconnectedCallback() { this.close(false); }

  localize() { if (this._autoLabel) this.menu?.setAttribute("aria-label", grT(this, "contextMenu.label")); }
  get items() { return Array.from(this.menu.querySelectorAll('[role="menuitem"]:not(:disabled):not([aria-disabled="true"])')); }
  get isOpen() { return Boolean(this.floating?.open); }

  openAt(rect, source) {
    this.close(false);
    this.source = source;
    // Return focus to whatever had it (keyboard invocation) rather than a possibly unfocusable row.
    this._returnFocus = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    this.floating.show();
    this.floating.place(rect, "bottom-start");
    document.addEventListener("pointerdown", this._outside, true);
    this._onScroll = () => this.close(false);
    document.addEventListener("scroll", this._onScroll, true);
    this.items[0]?.focus({ preventScroll: true });
    emit(this, "gr-open", { context: source?.closest?.("[data-gr-context-item]")?.dataset.grContextItem ?? null });
  }
  close(refocus = true) {
    if (!this.floating || !this.isOpen) return;
    this.floating.hide();
    document.removeEventListener("pointerdown", this._outside, true);
    document.removeEventListener("scroll", this._onScroll, true);
    if (refocus && this._returnFocus?.isConnected && typeof this._returnFocus.focus === "function") this._returnFocus.focus({ preventScroll: true });
    emit(this, "gr-close");
  }
}
