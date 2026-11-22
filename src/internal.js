/**
 * Shared, dependency-free helpers for the Gr8r UI custom elements.
 * Pure functions are exported so they can be covered by Node tests without a DOM.
 */
export const ElementBase = typeof HTMLElement === "undefined" ? class {} : HTMLElement;

let autoId = 0;
export const nextId = prefix => `${prefix}-${++autoId}`;

/** Dispatch a bubbling, cancelable custom event. Returns false when a listener called preventDefault(). */
export function emit(host, name, detail = {}) {
  return host.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable: true, detail }));
}

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * True when the user (OS setting) or the nearest `.gr-ui[data-gr-motion="reduce"]`
 * wrapper asks for reduced motion.
 */
export function motionReduced(element) {
  if (element?.closest?.('[data-gr-motion="reduce"]')) return true;
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Compute a viewport-safe position for a floating panel.
 * anchor: DOMRect-like { top, left, right, bottom, width, height }
 * floating: { width, height }
 * viewport: { width, height }
 * Flips between bottom/top when the preferred side lacks room and clamps to the viewport margin.
 */
export function computePlacement(anchor, floating, viewport, options = {}) {
  const { placement = "bottom-start", gap = 6, margin = 8 } = options;
  const [side = "bottom", align = "start"] = String(placement).split("-");
  const below = viewport.height - anchor.bottom - gap - margin;
  const above = anchor.top - gap - margin;
  let finalSide = side === "top" ? "top" : "bottom";
  if (finalSide === "bottom" && floating.height > below && above > below) finalSide = "top";
  else if (finalSide === "top" && floating.height > above && below > above) finalSide = "bottom";

  let top = finalSide === "bottom" ? anchor.bottom + gap : anchor.top - gap - floating.height;
  let left = align === "end"
    ? anchor.right - floating.width
    : align === "center" ? anchor.left + (anchor.width - floating.width) / 2 : anchor.left;

  left = clamp(left, margin, Math.max(margin, viewport.width - floating.width - margin));
  top = clamp(top, margin, Math.max(margin, viewport.height - floating.height - margin));
  return { top: Math.round(top), left: Math.round(left), side: finalSide };
}

/** Elements that can receive keyboard focus inside a container. */
export function focusables(root) {
  return Array.from(root?.querySelectorAll?.(
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  ) || []).filter(element => element.tabIndex >= 0 && !element.closest("[hidden]") && element.getAttribute("aria-hidden") !== "true");
}

export const supportsPopover = () => typeof HTMLElement !== "undefined" && typeof HTMLElement.prototype.showPopover === "function";

/**
 * A floating surface that uses the native Popover API (top layer, escapes overflow
 * and transforms) when available, and falls back to the hidden attribute.
 * Dismissal (Escape / outside pointer) is handled by the owning component so the
 * behaviour is identical in both modes.
 */
export function createFloating(panel) {
  const native = supportsPopover();
  if (native) {
    panel.setAttribute("popover", "manual");
    panel.hidden = false;
  } else panel.hidden = true;
  panel.classList.add("gr-floating");
  return {
    get open() { return native ? panel.matches(":popover-open") : !panel.hidden; },
    show() {
      if (native) { if (!panel.matches(":popover-open")) panel.showPopover(); }
      else panel.hidden = false;
    },
    hide() {
      if (native) { if (panel.matches(":popover-open")) panel.hidePopover(); }
      else panel.hidden = true;
    },
    /** Position against an element or a DOMRect-like object. */
    place(anchor, placement = "bottom-start") {
      const rect = typeof anchor?.getBoundingClientRect === "function" ? anchor.getBoundingClientRect() : anchor;
      panel.style.position = "fixed";
      panel.style.inset = "auto";
      panel.style.margin = "0";
      const size = panel.getBoundingClientRect();
      const result = computePlacement(rect, size, { width: window.innerWidth, height: window.innerHeight }, { placement });
      panel.style.top = result.top + "px";
      panel.style.left = result.left + "px";
      panel.dataset.side = result.side;
      return result;
    }
  };
}

/**
 * Shared roving-focus keyboard handling for menus and listboxes.
 * Returns true when the key was handled.
 */
export function rovingKeydown(event, items, { onEscape, onTab } = {}) {
  const i = items.indexOf(document.activeElement);
  const focus = index => { items[index]?.focus(); };
  switch (event.key) {
    case "ArrowDown": event.preventDefault(); focus((i + 1 + items.length) % items.length); return true;
    case "ArrowUp": event.preventDefault(); focus((i - 1 + items.length) % items.length); return true;
    case "Home": event.preventDefault(); focus(0); return true;
    case "End": event.preventDefault(); focus(items.length - 1); return true;
    case "Escape": event.preventDefault(); onEscape?.(); return true;
    case "Tab": onTab?.(); return false;
    default:
      if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey && event.key !== " ") {
        const key = event.key.toLocaleLowerCase();
        const start = i + 1;
        const ordered = items.slice(start).concat(items.slice(0, start));
        const match = ordered.find(item => item.textContent.trim().toLocaleLowerCase().startsWith(key));
        if (match) { event.preventDefault(); match.focus(); return true; }
      }
      return false;
  }
}

/** Index at which a dragged item should be inserted, given the vertical midpoints of the other items. */
export function dropIndex(midpoints, pointerY) {
  const index = midpoints.findIndex(mid => pointerY < mid);
  return index === -1 ? midpoints.length : index;
}

const effectTimers = new WeakMap();
/**
 * Play a one-shot CSS animation class and remove it after `durationMs`
 * (an effect may combine several animations, so a timer is more reliable than animationend).
 */
export function playEffect(element, className, durationMs = 1500) {
  if (!element || motionReduced(element)) return;
  clearTimeout(effectTimers.get(element));
  element.classList.remove(className);
  // Force a style flush so the animation restarts when replayed.
  void element.offsetWidth;
  element.classList.add(className);
  effectTimers.set(element, setTimeout(() => element.classList.remove(className), durationMs));
}
