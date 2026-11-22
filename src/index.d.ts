export type GrTheme = "light" | "dark" | "system";
export type GrAccent = "indigo" | "teal" | "rose" | "graphite";
export type GrDensity = "comfortable" | "compact";
export type GrMotion = "full" | "reduce";
export type GrToastTone = "neutral" | "success" | "warning" | "danger";
export type GrPlacement = "bottom-start" | "bottom-end" | "bottom-center" | "top-start" | "top-end" | "top-center";
export interface GrPreferences { theme?: GrTheme; accent?: GrAccent; density?: GrDensity; motion?: GrMotion; }
export const PREFERENCE_CHOICES: Readonly<{ theme: readonly GrTheme[]; accent: readonly GrAccent[]; density: readonly GrDensity[]; motion: readonly GrMotion[] }>;
export function applyGr8rPreferences(target: Element, options?: GrPreferences): Element;
export function resolveGr8rTheme(theme: GrTheme | string | undefined, media?: (query: string) => { matches: boolean }): "light" | "dark";

/** Locale tags with built-in strings; any BCP 47 tag is accepted and falls back to the closest match. */
export type GrLocale = "en" | "zh-CN" | (string & {});
export type GrMessageKey =
  | "switch.toggle" | "toast.dismiss" | "command.list" | "command.empty" | "popover.empty" | "contextMenu.label"
  | "calendar.previous" | "calendar.next" | "kanban.roledescription" | "kanban.hint" | "kanban.pickedUp" | "kanban.pickedUpAt"
  | "kanban.position" | "kanban.dropped" | "kanban.droppedOriginal" | "kanban.cancelled" | "kanban.rejected";
export function applyGr8rLocale(target: Element, locale: GrLocale): Element;
export function registerGr8rMessages(locale: string, messages: Partial<Record<GrMessageKey, string>> & Record<string, string>): void;
export function gr8rMessages(locale: string): Record<string, string>;
export function gr8rLocales(): string[];
export function matchGr8rLocale(tag: string | null | undefined): string;
export function resolveGr8rLocale(element: Element | null | undefined): string;
export function grT(element: Element | null | undefined, key: GrMessageKey | string, vars?: Record<string, string | number>): string;
export function formatMessage(template: string, vars?: Record<string, string | number>): string;

export interface GrRect { top: number; left: number; right: number; bottom: number; width: number; height: number; }
export function computePlacement(anchor: GrRect, floating: { width: number; height: number }, viewport: { width: number; height: number }, options?: { placement?: GrPlacement; gap?: number; margin?: number }): { top: number; left: number; side: "top" | "bottom" };
export function dropIndex(midpoints: number[], pointerY: number): number;
export function playEffect(element: Element | null | undefined, className: string, durationMs?: number): void;
export function monthMatrix(year: number, month: number, weekStart?: number): Date[][];
export function addMonths(date: Date, months: number): Date;
export function addDays(date: Date, days: number): Date;
export function toISODate(date: Date): string;
export function parseISODate(value: string | null | undefined): Date | null;

/** Every Gr8r element implements localize(): re-read built-in strings after its [lang] changes. */
export interface GrLocalizable { localize(): void; }
export class GrSwitch extends HTMLElement { checked: boolean; localize(): void; }
export class GrTabs extends HTMLElement { localize?(): void; activate(next: HTMLElement, notify?: boolean): void; moveIndicator(animate?: boolean): void; }
export class GrDialog extends HTMLElement { localize?(): void; show(): void; close(value?: string): void; }
export class GrDrawer extends GrDialog {}
export class GrDropdown extends HTMLElement { localize?(): void; open(): void; close(refocus?: boolean): void; }
export class GrPopover extends HTMLElement { localize?(): void; readonly isOpen: boolean; open(): void; close(refocus?: boolean): void; reposition(): void; }
export class GrSelect extends HTMLElement { localize?(): void; readonly isOpen: boolean; open(): void; close(refocus?: boolean): void; build(): void; }
export class GrContextMenu extends HTMLElement { localize?(): void; readonly isOpen: boolean; openAt(rect: GrRect, source?: Element | null): void; close(refocus?: boolean): void; }
export class GrCalendar extends HTMLElement { localize?(): void; value: string; }
export class GrKanban extends HTMLElement { localize?(): void; refresh(): void; }
export interface GrToastAction { label: string; onClick?: (toast: HTMLElement) => boolean | void; }
export class GrToastStack extends HTMLElement { localize?(): void; push(message: string, options?: { tone?: GrToastTone; duration?: number; action?: GrToastAction }): HTMLElement; }
export class GrCommandPalette extends HTMLElement { localize?(): void; open(): void; close(): void; }
export const ELEMENTS: Record<string, CustomElementConstructor>;
export function defineGr8rElements(registry?: CustomElementRegistry): void;

export interface GrMoveDetail { card: string; from: string; to: string; index: number; fromIndex: number; }
declare global {
  interface HTMLElementTagNameMap {
    "gr-switch": GrSwitch;
    "gr-tabs": GrTabs;
    "gr-dialog": GrDialog;
    "gr-drawer": GrDrawer;
    "gr-dropdown": GrDropdown;
    "gr-popover": GrPopover;
    "gr-select": GrSelect;
    "gr-context-menu": GrContextMenu;
    "gr-calendar": GrCalendar;
    "gr-kanban": GrKanban;
    "gr-toast-stack": GrToastStack;
    "gr-command-palette": GrCommandPalette;
  }
  interface HTMLElementEventMap {
    "gr-change": CustomEvent<{ checked?: boolean; tab?: string; value?: string }>;
    "gr-select": CustomEvent<{ value: string; label?: string; selected?: boolean; context?: string | null }>;
    "gr-command": CustomEvent<{ command: string }>;
    "gr-move": CustomEvent<GrMoveDetail>;
    "gr-open": CustomEvent<{ context?: string | null }>;
    "gr-close": CustomEvent;
  }
}
