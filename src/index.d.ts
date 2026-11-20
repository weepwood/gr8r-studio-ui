export type GrTheme = "light" | "dark";
export type GrAccent = "indigo" | "teal" | "rose" | "graphite";
export type GrDensity = "comfortable" | "compact";
export interface GrPreferences { theme?: GrTheme; accent?: GrAccent; density?: GrDensity; }
export function applyGr8rPreferences(target: Element, options?: GrPreferences): Element;
export class GrSwitch extends HTMLElement { checked: boolean; }
export class GrTabs extends HTMLElement { activate(next: HTMLElement, notify?: boolean): void; }
export class GrDialog extends HTMLElement { show(): void; close(value?: string): void; }
export class GrDropdown extends HTMLElement { open(): void; close(refocus?: boolean): void; }
export class GrToastStack extends HTMLElement { push(message: string, options?: { tone?: "neutral" | "success" | "danger"; duration?: number }): HTMLElement; }
export class GrCommandPalette extends HTMLElement { open(): void; close(): void; }
export const ELEMENTS: Record<string, CustomElementConstructor>;
export function defineGr8rElements(registry?: CustomElementRegistry): void;
declare global {
  interface HTMLElementTagNameMap {
    "gr-switch": GrSwitch;
    "gr-tabs": GrTabs;
    "gr-dialog": GrDialog;
    "gr-dropdown": GrDropdown;
    "gr-toast-stack": GrToastStack;
    "gr-command-palette": GrCommandPalette;
  }
  interface HTMLElementEventMap {
    "gr-change": CustomEvent<{ checked?: boolean; tab?: string }>;
    "gr-select": CustomEvent<{ value: string }>;
    "gr-command": CustomEvent<{ command: string }>;
    "gr-open": CustomEvent;
    "gr-close": CustomEvent;
  }
}
