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

// Renders the snapshot into a compact human-readable block that goes into
// the message body. Teacher sees this at the top of the help request.
export function formatHelpSnapshot(snap: HelpSnapshot): string {
  const lines: string[] = [];
  if (snap.drillQid) lines.push(`question: ${snap.drillQid}`);
  if (snap.bootcamp) lines.push(`bootcamp: ${snap.bootcamp.id} · day ${snap.bootcamp.day}`);
  lines.push(`page: ${snap.path}`);
  return lines.join('\n');
}
