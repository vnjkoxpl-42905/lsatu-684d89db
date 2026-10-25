// Item A — surface-agnostic publisher for "where is the student right now"
// so the Help sheet can attach context to a request without coupling to
// drill/bootcamp internals. Mirrors the drillNotepadBus pattern.

import { getActiveDrillQid } from './drillNotepadBus';

export interface BootcampContext {
  id: string;
  day: number;
}

export interface HelpSnapshot {
  path: string;
  title: string;
  drillQid: string | null;
  bootcamp: BootcampContext | null;
  capturedAt: string;
}

let currentBootcamp: BootcampContext | null = null;
const listeners = new Set<() => void>();

export function setBootcampContext(ctx: BootcampContext | null): void {
  const same =
    (ctx === null && currentBootcamp === null) ||
    (ctx !== null &&
      currentBootcamp !== null &&
      ctx.id === currentBootcamp.id &&
      ctx.day === currentBootcamp.day);
  if (same) return;
  currentBootcamp = ctx;
  for (const cb of listeners) cb();
}

export function subscribeHelpContext(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getHelpSnapshot(): HelpSnapshot {
  return {
    path:
      typeof window !== 'undefined'
        ? window.location.pathname + window.location.search
        : '',
    title: typeof document !== 'undefined' ? document.title : '',
    drillQid: getActiveDrillQid(),
    bootcamp: currentBootcamp,
    capturedAt: new Date().toISOString(),
  };
}

// Renders the snapshot into a compact human-readable block. Retained for the
// admin/teacher tooling that still reads a plain-text context summary; it is no
// longer concatenated into the student's message body (that leaked raw route
// strings into the thread).
export function formatHelpSnapshot(snap: HelpSnapshot): string {
  const lines: string[] = [];
  if (snap.drillQid) lines.push(`question: ${snap.drillQid}`);
  if (snap.bootcamp) lines.push(`bootcamp: ${snap.bootcamp.id} · day ${snap.bootcamp.day}`);
  lines.push(`page: ${snap.path}`);
  return lines.join('\n');
}

// Strips a common site suffix ("Intro to LR | LSAT U" -> "Intro to LR") so the
// human labels below read cleanly. Falls back to the raw title.
function cleanTitle(title: string | null | undefined): string {
  const t = (title ?? '').trim();
  if (!t) return '';
  return t.split(/\s+[|·–—]\s+/)[0].trim() || t;
}

// A human page label for the context card heading — never a raw filename or
// route. Example: "Intro to LR · Day 2".
export function helpSnapshotHeading(snap: HelpSnapshot): string {
  const base = cleanTitle(snap.title) || 'This page';
  if (snap.bootcamp) return `${base} · Day ${snap.bootcamp.day}`;
  return base;
}

// Natural-language label for the "Smart Click" route button. Reads like what
// the destination IS, never a URL or a generic "Go to page".
export function smartClickLabel(snap: HelpSnapshot): string {
  const name = cleanTitle(snap.title);
  if (snap.bootcamp) return `Open the ${name || 'Intro to LR'} bootcamp`;
  if (snap.drillQid) return 'Open this question';
  if (name) return `Open the ${name} page`;
  return 'Open this page';
}
