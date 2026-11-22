# Changelog

## 0.4.0 — 2026-11-23

### Added
- **Simplified Chinese (zh-CN) localisation** for the library and the gallery.
- `src/i18n.js`: built-in strings for all elements in `en` and `zh-CN`, resolved per element from the nearest `[lang]`; `applyGr8rLocale(target, locale)`, `registerGr8rMessages()`, `grT()`, `resolveGr8rLocale()`, `matchGr8rLocale()`, `gr8rMessages()`, `gr8rLocales()`, `formatMessage()`.
- Every element with built-in text implements `localize()` (switch, toast stack, command palette, popover, context menu, calendar, kanban).
- Kanban live announcements, hint and role description are localised; the calendar uses `Intl` with the element's locale.
- CJK font fallbacks in `--gr-font` and `:lang(zh)` typography (neutral tracking on headings, 1.6 leading).
- Gallery: language toggle in the top bar and in Appearance, command “Switch language”, browser-language default, saved preference, no-flash bootstrap, cross-tab sync; text nodes, `aria-label`, placeholders, tooltips, toasts and generated labels are translated; untouched sample tasks switch language, edited tasks don't; Chinese sample tasks; search also matches displayed (translated) category and priority; title sort uses the locale's collation.
- Tests: `test/i18n.test.mjs` (key / placeholder parity, locale matching, registration, `applyGr8rLocale`, no hard-coded component strings, reversible phrase table, **coverage of every visible English string in index.html**, message keys used by the gallery) and `e2e/i18n.spec.js` (switch both ways, persistence, localised elements, pickers, Chinese-browser first visit, sweep for leftover English).

### Changed
- `gr-select` also observes `characterData` so translated option text rebuilds the listbox.
- Gallery selects use explicit `value` attributes so form values don't change with the language.


## 0.3.0 — 2026-11-23

### Added
- **6 new Web Components** (12 total), all independently written:
  - `gr-popover` — anchored top-layer panel; with a `role="listbox"` inside it becomes a property picker (status, priority, assignee) with filter, type-ahead and cancelable `gr-select`.
  - `gr-select` — enhances a native `<select>` (optgroups, disabled options, colour dots); native element remains the source of truth.
  - `gr-context-menu` — right-click / ContextMenu key / Shift+F10, reports `{ value, context }`.
  - `gr-calendar` — month grid date picker with full keyboard model, `min` / `max`, locale-aware names.
  - `gr-kanban` — pointer drag (touch: press-and-hold), FLIP reflow, settle animation, keyboard pick-up / move / drop / cancel, live announcements, cancelable `gr-move`.
  - `gr-drawer` — modal side sheet sharing the `gr-dialog` API.
- CSS components: `gr-status`, `gr-priority`, `gr-status-label`, `gr-alert`, `gr-chip`, `gr-breadcrumbs`, `gr-stat-group`, `gr-spinner`, `gr-picker`, `gr-props`, `gr-link`; tag colours teal / amber / rose / red / orange / outline; avatar sizes and presence; progress tones.
- `src/motion.css`: `gr-fx-rise`, `gr-fx-added`, `gr-fx-done`, `gr-fx-land`, `gr-fx-leave`, `gr-fx-shake`, `gr-progress--animate`; motion tokens `--gr-ease-out | in-out | spring`, `--gr-duration-fast | base | slow`.
- Tokens: elevation (`--gr-shadow-card | hover | drag`), `--gr-focus-ring`, z-index scale, three new AA-contrast hues.
- Preferences: `theme: "system"` (pure CSS, no flash) and `motion: "full" | "reduce"`; `resolveGr8rTheme()`, `PREFERENCE_CHOICES`, `playEffect()`, `computePlacement()`, `dropIndex()` and calendar helpers exported.
- `gr-toast-stack.push()` accepts `action: { label, onClick }` and `tone: "warning"`; a pausable countdown line shows remaining time.
- `gr-tabs` sliding indicator.
- Gallery: Preview / Code / API on every component card, Motion section, Pickers & popovers, Status & priority, interactive board, task context menu and drawer, reset sample data, no-flash appearance bootstrap, cross-tab sync.
- Tests: `test/v03-components.test.mjs` (placement, drop index, calendar maths, preferences, contrast of new hues, system/dark token parity, motion fallbacks, docs / types / gallery coverage) and `e2e/v03.spec.js`.

### Changed
- Checkbox check mark scales in; switch thumb uses a spring; tooltips wait ~0.3 s for intent before fading in.
- Menus open with a short scale + fade using individual `translate` / `scale` properties so viewport corrections on `transform` are preserved.
- Task details now open in a drawer; completing a task plays a check + strike-through before a filtered row leaves; deleted rows slide out; created / restored rows rise in.
- Custom events are now cancelable (`emit()` returns whether the default was allowed).

### Notes
- The original Gr8r Studio repository has no explicit licence. Everything here is written from scratch; only the visual language and interaction ideas are referenced.
