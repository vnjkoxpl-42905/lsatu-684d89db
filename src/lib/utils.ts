import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Open an in-app route in a new tab, falling back to same-tab navigation when
 * the browser blocks the popup (e.g. inside embedded preview iframes like the
 * Lovable editor, where window.open returns null). Without the fallback, "Open"
 * buttons silently do nothing in those contexts.
 */
export function openRoute(route: string) {
  const win = window.open(route, '_blank', 'noopener,noreferrer');
  if (!win) window.location.assign(route);
}

export function normalizeText(s: string) {
  return s
    .replace(/\r/g, '')
    .replace(/\n([A-Z][a-z]+):/g, '\n\n$1:')  // Preserve speaker breaks
    .replace(/(?<!\n)\n(?!\n)/g, ' ')
    .replace(/\n{3,}/g, '\n\n')  // Collapse 3+ newlines to 2
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
