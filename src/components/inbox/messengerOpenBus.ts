// Shared signal for whether ANY bottom-right surface is currently open —
// the student FloatingMessenger panel or the Help sheet. Two consumers use it:
//   - StudentCornerBubble stays quiet while the messenger panel is open
//     (messenger-only check, preserved as isMessengerOpen()).
//   - The messenger launcher and the Help "?" launcher both hide whenever ANY
//     bottom-right surface is open, so a launcher never sits on top of an open
//     panel/sheet and the two launchers never render at once.

import { useSyncExternalStore } from 'react';

type Surface = 'messenger' | 'help';
type Listener = () => void;

const openSurfaces = new Set<Surface>();
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

function setSurfaceOpen(surface: Surface, open: boolean) {
  const had = openSurfaces.has(surface);
  if (open === had) return;
  if (open) openSurfaces.add(surface);
  else openSurfaces.delete(surface);
  emit();
}

export function setMessengerOpen(open: boolean) {
  setSurfaceOpen('messenger', open);
}

export function setHelpSheetOpen(open: boolean) {
  setSurfaceOpen('help', open);
}

// Messenger-panel-only — preserves StudentCornerBubble's existing behavior.
export function isMessengerOpen() {
  return openSurfaces.has('messenger');
}

// True when any bottom-right surface (messenger panel OR help sheet) is open.
export function isBottomRightSurfaceOpen() {
  return openSurfaces.size > 0;
}

export function subscribeBottomRightSurface(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

// React hook: re-renders a launcher when the "any surface open" signal flips.
export function useBottomRightSurfaceOpen() {
  return useSyncExternalStore(
    subscribeBottomRightSurface,
    isBottomRightSurfaceOpen,
    isBottomRightSurfaceOpen,
  );
}
