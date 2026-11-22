import { ElementBase, emit, nextId } from "./internal.js";
import { grT } from "./i18n.js";

/* ---------- Pure date helpers (local calendar dates, no time-zone drift) ---------- */
const pad = n => String(n).padStart(2, "0");
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
export function parseISODate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ""));
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}
export function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
/** Adds months and clamps the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(date.getDate(), last));
}
export const sameDay = (a, b) => Boolean(a && b) && toISODate(a) === toISODate(b);
/** Six weeks × seven days covering `month` (0-based), starting on `weekStart` (0 = Sunday, 1 = Monday). */
export function monthMatrix(year, month, weekStart = 1) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() - weekStart + 7) % 7;
  const start = addDays(first, -offset);
  return Array.from({ length: 6 }, (_, week) =>
    Array.from({ length: 7 }, (_, day) => addDays(start, week * 7 + day)));
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/**
 * <gr-calendar value="2026-11-25" min="2026-01-01" max="2026-12-31" week-start="1">
 * Keyboard: arrows (day / week), Home / End (week), PageUp / PageDown (month, +Shift: year), Enter / Space (select).
 */
export class GrCalendar extends ElementBase {
  static get observedAttributes() { return ["value", "min", "max", "week-start", "lang"]; }

  connectedCallback() {
    if (!this._built) this.build();
    const selected = parseISODate(this.getAttribute("value"));
    this.focusDate = this.clampDate(selected || this.focusDate || new Date());
    this.render();
  }
  attributeChangedCallback(name) {
    if (!this._built) return;
    if (name === "value") {
      const next = parseISODate(this.getAttribute("value"));
      if (next) this.focusDate = this.clampDate(next);
    }
    this.render();
  }

  get value() { return this.getAttribute("value") || ""; }
  set value(next) {
    const date = parseISODate(next);
    if (date) this.setAttribute("value", toISODate(date)); else this.removeAttribute("value");
  }
  /** Locale for Intl formatting: nearest [lang], then <html lang>. */
  get locale() {
    const tag = this.closest("[lang]")?.getAttribute("lang") || document.documentElement.getAttribute("lang") || undefined;
    try { return tag ? Intl.getCanonicalLocales(tag)[0] : undefined; } catch { return undefined; }
  }
  localize() {
    if (!this._built) return;
    this.prevButton.setAttribute("aria-label", grT(this, "calendar.previous"));
    this.nextButton.setAttribute("aria-label", grT(this, "calendar.next"));
    this.render();
  }
  get weekStart() { const n = Number(this.getAttribute("week-start") ?? 1); return n >= 0 && n <= 6 ? n : 1; }
  clampDate(date) {
    const min = parseISODate(this.getAttribute("min"));
    const max = parseISODate(this.getAttribute("max"));
    if (min && date < min) return min;
    if (max && date > max) return max;
    return date;
  }
  isDisabled(date) {
    const min = parseISODate(this.getAttribute("min"));
    const max = parseISODate(this.getAttribute("max"));
    return Boolean((min && date < min) || (max && date > max));
  }

  build() {
    this._built = true;
    this.classList.add("gr-calendar");
    if (!this.hasAttribute("role")) this.setAttribute("role", "group");
    const header = el("div", "gr-calendar__header");
    this.label = el("span", "gr-calendar__label");
    this.label.id = nextId("gr-calendar-label");
    this.label.setAttribute("aria-live", "polite");
    const nav = (text, key, delta) => {
      const button = el("button", "gr-icon-button gr-calendar__nav", text);
      button.type = "button";
      button.setAttribute("aria-label", grT(this, key));
      button.addEventListener("click", () => { this.move(addMonths(this.focusDate, delta), false); });
      return button;
    };
    this.prevButton = nav("‹", "calendar.previous", -1);
    this.nextButton = nav("›", "calendar.next", 1);
    header.append(this.prevButton, this.label, this.nextButton);
    this.grid = el("table", "gr-calendar__grid");
    this.grid.setAttribute("role", "grid");
    this.grid.setAttribute("aria-labelledby", this.label.id);
    this.replaceChildren(header, this.grid);

    this.grid.addEventListener("click", event => {
      const button = event.target.closest("button[data-date]");
      if (button && !button.disabled) this.select(parseISODate(button.dataset.date));
    });
    this.grid.addEventListener("keydown", event => this.onKey(event));
  }

  onKey(event) {
    const date = this.focusDate;
    const map = {
      ArrowLeft: () => addDays(date, -1),
      ArrowRight: () => addDays(date, 1),
      ArrowUp: () => addDays(date, -7),
      ArrowDown: () => addDays(date, 7),
      Home: () => addDays(date, -((date.getDay() - this.weekStart + 7) % 7)),
      End: () => addDays(date, 6 - ((date.getDay() - this.weekStart + 7) % 7)),
      PageUp: () => addMonths(date, event.shiftKey ? -12 : -1),
      PageDown: () => addMonths(date, event.shiftKey ? 12 : 1)
    };
    if (map[event.key]) {
      event.preventDefault();
      this.move(map[event.key](), true);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!this.isDisabled(date)) this.select(date);
    }
  }

  move(date, focus) {
    this.focusDate = this.clampDate(date);
    this.render();
    if (focus) this.grid.querySelector('button[tabindex="0"]')?.focus();
  }

  select(date) {
    if (!date || this.isDisabled(date)) return;
    this.focusDate = date;
    this.setAttribute("value", toISODate(date)); // re-renders via attributeChangedCallback
    this.grid.querySelector('button[tabindex="0"]')?.focus();
    emit(this, "gr-change", { value: toISODate(date) });
  }

  render() {
    if (!this.grid || !this.focusDate) return;
    const locale = this.locale;
    const focus = this.focusDate;
    const selected = parseISODate(this.getAttribute("value"));
    const today = new Date();
    this.label.textContent = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(focus);
    const long = new Intl.DateTimeFormat(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
    const short = new Intl.DateTimeFormat(locale, { weekday: "narrow" });
    const weeks = monthMatrix(focus.getFullYear(), focus.getMonth(), this.weekStart);

    const head = el("thead");
    const headRow = el("tr");
    for (const day of weeks[0]) {
      const th = el("th", "", short.format(day));
      th.scope = "col";
      th.setAttribute("abbr", new Intl.DateTimeFormat(locale, { weekday: "long" }).format(day));
      headRow.append(th);
    }
    head.append(headRow);
    const body = el("tbody");
    for (const week of weeks) {
      const row = el("tr");
      for (const day of week) {
        const cell = el("td");
        const button = el("button", "gr-calendar__day", String(day.getDate()));
        button.type = "button";
        button.dataset.date = toISODate(day);
        button.tabIndex = sameDay(day, focus) ? 0 : -1;
        button.setAttribute("aria-label", long.format(day));
        if (day.getMonth() !== focus.getMonth()) button.dataset.outside = "";
        if (sameDay(day, today)) button.setAttribute("aria-current", "date");
        if (sameDay(day, selected)) { button.setAttribute("aria-pressed", "true"); cell.setAttribute("aria-selected", "true"); }
        if (this.isDisabled(day)) button.disabled = true;
        cell.append(button);
        row.append(cell);
      }
      body.append(row);
    }
    this.grid.replaceChildren(head, body);
  }
}
