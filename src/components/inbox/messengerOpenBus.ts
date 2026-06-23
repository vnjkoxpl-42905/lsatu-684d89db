// Tiny shared signal for whether the student FloatingMessenger panel is open.
// StudentCornerBubble uses this to avoid popping a proactive bubble while the
// full messenger is already on screen.

type Listener = (open: boolean) => void;

let isOpen = false;
const listeners = new Set<Listener>();

export function setMessengerOpen(open: boolean) {
  if (open === isOpen) return;
  isOpen = open;
  for (const l of listeners) l(isOpen);
}

export function isMessengerOpen() {
  return isOpen;
}

export function subscribeMessengerOpen(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
