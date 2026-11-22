import { ElementBase, clamp, dropIndex, emit, motionReduced, nextId, playEffect } from "./internal.js";
import { grT } from "./i18n.js";

const INTERACTIVE = "a, button, input, select, textarea, label, [contenteditable], [data-gr-no-drag]";
const DRAG_THRESHOLD = 5;
const TOUCH_HOLD_MS = 260;

/**
 * <gr-kanban aria-label="Sprint board">
 *   <div class="gr-kanban">
 *     <section class="gr-kanban-column" data-gr-column="todo" aria-label="To do">
 *       <div class="gr-kanban-column__heading">To do <small data-gr-count></small></div>
 *       <div class="gr-kanban-column__cards" data-gr-list>
 *         <article class="gr-kanban-card" data-gr-card="DES-1">…</article>
 *       </div>
 *     </section>
 *   </div>
 * </gr-kanban>
 *
 * Pointer: drag a card (touch: press and hold). Keyboard: Space picks a card up,
 * arrow keys move it, Space / Enter drops, Escape cancels. Arrow keys without a
 * picked-up card move focus between cards.
 * Event: gr-move { card, from, to, index, fromIndex } — cancelable; preventDefault() reverts.
 */
export class GrKanban extends ElementBase {
  connectedCallback() {
    if (this._ready) { this.refresh(); return; }
    this._ready = true;
    this.live = document.createElement("div");
    this.live.className = "gr-visually-hidden";
    this.live.setAttribute("aria-live", "assertive");
    this.hint = document.createElement("p");
    this.hint.className = "gr-visually-hidden";
    this.hint.id = nextId("gr-kanban-hint");
    this.hint.textContent = grT(this, "kanban.hint");
    this.append(this.live, this.hint);
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");

    this._down = event => this.onPointerDown(event);
    this._move = event => this.onPointerMove(event);
    this._up = event => this.onPointerUp(event);
    this._cancel = () => this.cancelDrag();
    this._keys = event => this.onKey(event);
    this._click = event => {
      if (this._suppressClick) { event.preventDefault(); event.stopPropagation(); this._suppressClick = false; }
    };
    this._touchMove = event => { if (this.drag?.active) event.preventDefault(); };
    this.addEventListener("pointerdown", this._down);
    this.addEventListener("keydown", this._keys);
    this.addEventListener("click", this._click, true);
    this.addEventListener("touchmove", this._touchMove, { passive: false });
    this.refresh();
  }
  disconnectedCallback() { this.cancelDrag(); }
  localize() { if (this.hint) this.hint.textContent = grT(this, "kanban.hint"); this.refresh(); }
  t(key, vars) { return grT(this, key, vars); }

  get columns() { return Array.from(this.querySelectorAll("[data-gr-column]")); }
  listOf(column) { return column.querySelector("[data-gr-list]") || column; }
  cardsIn(column) { return Array.from(this.listOf(column).querySelectorAll(":scope > [data-gr-card]")); }
  columnName(column) {
    return column.getAttribute("aria-label") || column.querySelector(".gr-kanban-column__heading")?.firstChild?.textContent.trim() || column.dataset.grColumn;
  }
  cardName(card) {
    return card.getAttribute("aria-label") || card.querySelector("b, strong, h3, h4")?.textContent.trim() || card.dataset.grCard;
  }

  /** Re-scan cards: call after adding or removing cards from outside. */
  refresh() {
    for (const column of this.columns) {
      const list = this.listOf(column);
      list.setAttribute("role", "list");
      for (const card of this.cardsIn(column)) {
        card.setAttribute("role", "listitem");
        if (!card.hasAttribute("tabindex")) card.tabIndex = 0;
        card.setAttribute("aria-describedby", this.hint.id);
        card.setAttribute("aria-roledescription", this.t("kanban.roledescription"));
      }
      const count = column.querySelector("[data-gr-count]");
      if (count) count.textContent = String(this.cardsIn(column).length);
    }
  }

  announce(message) {
    this.live.textContent = "";
    // A new text node per message so repeated announcements are still spoken.
    requestAnimationFrame(() => { this.live.textContent = message; });
  }

  position(card) {
    const column = card.closest("[data-gr-column]");
    return { column, index: this.cardsIn(column).indexOf(card) };
  }

  /* ---------- FLIP: animate siblings when the layout shifts ---------- */
  snapshot() {
    if (motionReduced(this)) return null;
    const map = new Map();
    for (const card of this.querySelectorAll("[data-gr-card], .gr-kanban-placeholder")) map.set(card, card.getBoundingClientRect());
    return map;
  }
  flip(before, skip) {
    if (!before) return;
    for (const [card, rect] of before) {
      if (card === skip || !card.isConnected || typeof card.animate !== "function") continue;
      const now = card.getBoundingClientRect();
      const dx = rect.left - now.left, dy = rect.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      card.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], { duration: 180, easing: "cubic-bezier(.2, .8, .2, 1)" });
    }
  }

  /* ---------- Pointer drag ---------- */
  onPointerDown(event) {
    if (event.button !== 0 || this.drag || this.keyboard) return;
    const card = event.target.closest("[data-gr-card]");
    if (!card || !this.contains(card)) return;
    const handle = card.querySelector("[data-gr-handle]");
    if (handle ? !handle.contains(event.target) : event.target.closest(INTERACTIVE) && event.target.closest(INTERACTIVE) !== card) return;
    const { column, index } = this.position(card);
    this.drag = { card, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, fromColumn: column, fromIndex: index, active: false, touch: event.pointerType === "touch" };
    if (this.drag.touch) this.drag.holdTimer = setTimeout(() => { if (this.drag && !this.drag.active) this.startDrag(); }, TOUCH_HOLD_MS);
    document.addEventListener("pointermove", this._move);
    document.addEventListener("pointerup", this._up);
    document.addEventListener("pointercancel", this._cancel);
  }

  onPointerMove(event) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.x = event.clientX; drag.y = event.clientY;
    if (!drag.active) {
      const moved = Math.hypot(drag.x - drag.startX, drag.y - drag.startY) > DRAG_THRESHOLD;
      if (drag.touch) { if (moved) this.teardownPointer(); return; } // a swipe before the hold: let the page scroll
      if (moved) this.startDrag(); else return;
    }
    event.preventDefault();
    this.updateDrag();
  }

  startDrag() {
    const drag = this.drag;
    const rect = drag.card.getBoundingClientRect();
    drag.active = true;
    drag.offsetX = drag.startX - rect.left;
    drag.offsetY = drag.startY - rect.top;
    drag.placeholder = document.createElement("div");
    drag.placeholder.className = "gr-kanban-placeholder";
    drag.placeholder.style.height = rect.height + "px";
    drag.placeholder.setAttribute("aria-hidden", "true");
    drag.card.before(drag.placeholder);

    // The ghost lives on the closest .gr-ui root so tokens apply and no transformed ancestor clips it.
    drag.ghost = drag.card.cloneNode(true);
    drag.ghost.removeAttribute("id");
    drag.ghost.removeAttribute("tabindex");
    drag.ghost.removeAttribute("aria-describedby");
    drag.ghost.querySelectorAll("[id]").forEach(node => node.removeAttribute("id"));
    drag.ghost.classList.add("gr-kanban-ghost");
    drag.ghost.setAttribute("aria-hidden", "true");
    drag.ghost.style.width = rect.width + "px";
    drag.ghost.style.height = rect.height + "px";
    (this.closest(".gr-ui") || document.body).append(drag.ghost);
    drag.card.hidden = true;
    drag.card.dataset.grDragging = "true";
    this.dataset.grDragging = "true";
    document.getSelection?.()?.removeAllRanges();
    this.updateDrag();
    this.announce(this.t("kanban.pickedUp", { card: this.cardName(drag.card) }));
  }

  updateDrag() {
    const drag = this.drag;
    drag.ghost.style.transform = `translate3d(${drag.x - drag.offsetX}px, ${drag.y - drag.offsetY}px, 0) rotate(1.5deg)`;
    const hit = document.elementFromPoint(drag.x, drag.y);
    const column = hit?.closest?.("[data-gr-column]");
    for (const item of this.columns) item.toggleAttribute("data-drag-over", item === column && this.contains(column));
    this.autoScroll();
    if (!column || !this.contains(column)) return;
    const list = this.listOf(column);
    const others = this.cardsIn(column).filter(card => card !== drag.card);
    const index = dropIndex(others.map(card => { const r = card.getBoundingClientRect(); return r.top + r.height / 2; }), drag.y);
    const reference = others[index] || null;
    if (drag.placeholder.parentElement === list && drag.placeholder.nextElementSibling === (reference || null)) return;
    if (reference && reference.previousElementSibling === drag.placeholder) return;
    const before = this.snapshot();
    list.insertBefore(drag.placeholder, reference);
    this.flip(before, drag.placeholder);
  }

  autoScroll() {
    const scroller = this.querySelector(".gr-kanban") || this;
    const rect = scroller.getBoundingClientRect();
    const edge = 48;
    if (this.drag.x < rect.left + edge) scroller.scrollLeft -= 14;
    else if (this.drag.x > rect.right - edge) scroller.scrollLeft += 14;
  }

  onPointerUp(event) {
    const drag = this.drag;
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.active) { this.teardownPointer(); return; }
    const { placeholder, card, ghost } = drag;
    const targetColumn = placeholder.closest("[data-gr-column]");
    const ghostRect = ghost.getBoundingClientRect();
    placeholder.replaceWith(card);
    card.hidden = false;
    this._suppressClick = true;
    setTimeout(() => { this._suppressClick = false; }, 0);
    this.finishMove(card, drag.fromColumn, drag.fromIndex, targetColumn, ghostRect);
    this.teardownPointer();
  }

  cancelDrag() {
    const drag = this.drag;
    if (!drag) return;
    if (drag.active) {
      const before = this.snapshot();
      drag.placeholder.remove();
      drag.card.hidden = false;
      this.flip(before);
      this.announce(this.t("kanban.cancelled", { card: this.cardName(drag.card), column: this.columnName(drag.fromColumn) }));
    }
    this.teardownPointer();
  }

  teardownPointer() {
    const drag = this.drag;
    if (!drag) return;
    clearTimeout(drag.holdTimer);
    drag.ghost?.remove();
    drag.placeholder?.remove();
    if (drag.card) { drag.card.hidden = false; delete drag.card.dataset.grDragging; }
    for (const column of this.columns) column.removeAttribute("data-drag-over");
    delete this.dataset.grDragging;
    document.removeEventListener("pointermove", this._move);
    document.removeEventListener("pointerup", this._up);
    document.removeEventListener("pointercancel", this._cancel);
    this.drag = null;
  }

  /** Commit a move (pointer or keyboard). Reverts if a gr-move listener cancels it. */
  finishMove(card, fromColumn, fromIndex, toColumn, settleFrom = null) {
    const index = this.cardsIn(toColumn).indexOf(card);
    if (toColumn === fromColumn && index === fromIndex) { this.settle(card, settleFrom); this.refresh(); this.announce(this.t("kanban.droppedOriginal", { card: this.cardName(card) })); return true; }
    const allowed = emit(this, "gr-move", {
      card: card.dataset.grCard, from: fromColumn.dataset.grColumn, to: toColumn.dataset.grColumn, index, fromIndex
    });
    if (!allowed) {
      const list = this.listOf(fromColumn);
      list.insertBefore(card, this.cardsIn(fromColumn).filter(item => item !== card)[fromIndex] || null);
      this.refresh();
      this.announce(this.t("kanban.rejected", { card: this.cardName(card), column: this.columnName(fromColumn) }));
      return false;
    }
    this.refresh();
    if (settleFrom) this.settle(card, settleFrom); else playEffect(card, "gr-fx-land", 520);
    const total = this.cardsIn(toColumn).length;
    this.announce(this.t("kanban.dropped", { card: this.cardName(card), column: this.columnName(toColumn), position: index + 1, total }));
    return true;
  }

  /** Glide a dropped card from where the ghost was released into its slot. */
  settle(card, from) {
    if (!from || motionReduced(this) || typeof card.animate !== "function") return;
    const to = card.getBoundingClientRect();
    const dx = from.left - to.left, dy = from.top - to.top;
    card.animate([
      { transform: `translate(${dx}px, ${dy}px) rotate(1.5deg) scale(1.02)` },
      { transform: "none" }
    ], { duration: 260, easing: "cubic-bezier(.2, .9, .25, 1.15)" });
  }

  /* ---------- Keyboard ---------- */
  onKey(event) {
    const card = event.target.closest?.("[data-gr-card]");
    if (!card || event.target !== card || this.drag) return;
    const { column, index } = this.position(card);
    const columns = this.columns;
    const ci = columns.indexOf(column);

    if (!this.keyboard) {
      if (event.key === " ") {
        event.preventDefault();
        this.keyboard = { card, fromColumn: column, fromIndex: index };
        card.dataset.grGrabbed = "true";
        this.announce(this.t("kanban.pickedUpAt", { card: this.cardName(card), column: this.columnName(column), position: index + 1 }));
        return;
      }
      const target = {
        ArrowDown: () => this.cardsIn(column)[index + 1],
        ArrowUp: () => this.cardsIn(column)[index - 1],
        ArrowRight: () => { const next = columns[ci + 1]; return next && this.cardsIn(next)[Math.min(index, this.cardsIn(next).length - 1)]; },
        ArrowLeft: () => { const prev = columns[ci - 1]; return prev && this.cardsIn(prev)[Math.min(index, this.cardsIn(prev).length - 1)]; }
      }[event.key]?.();
      if (target) { event.preventDefault(); target.focus(); }
      return;
    }

    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      let toColumn = column, toIndex = index;
      if (event.key === "ArrowUp") toIndex = index - 1;
      if (event.key === "ArrowDown") toIndex = index + 1;
      if (event.key === "ArrowLeft") toColumn = columns[ci - 1];
      if (event.key === "ArrowRight") toColumn = columns[ci + 1];
      if (!toColumn) return;
      const others = this.cardsIn(toColumn).filter(item => item !== card);
      toIndex = clamp(toIndex, 0, others.length);
      if (toColumn === column && toIndex === index) return;
      const before = this.snapshot();
      this.listOf(toColumn).insertBefore(card, others[toIndex] || null);
      this.flip(before);
      card.focus({ preventScroll: false });
      this.announce(this.t("kanban.position", { column: this.columnName(toColumn), position: toIndex + 1, total: others.length + 1 }));
    } else if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      const { fromColumn, fromIndex } = this.keyboard;
      this.releaseKeyboard(card);
      this.finishMove(card, fromColumn, fromIndex, card.closest("[data-gr-column]"));
      card.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      const { fromColumn, fromIndex } = this.keyboard;
      this.releaseKeyboard(card);
      const before = this.snapshot();
      this.listOf(fromColumn).insertBefore(card, this.cardsIn(fromColumn).filter(item => item !== card)[fromIndex] || null);
      this.flip(before);
      card.focus();
      this.refresh();
      this.announce(this.t("kanban.cancelled", { card: this.cardName(card), column: this.columnName(fromColumn) }));
    } else if (event.key === "Tab") {
      event.preventDefault(); // keep focus on the lifted card until it is dropped or cancelled
    }
  }

  releaseKeyboard(card) {
    delete card.dataset.grGrabbed;
    this.keyboard = null;
  }
}
