// chatBus — fire-and-forget signal for opening the FloatingMessenger panel
// from outside the component (e.g. the FoyerDock chat button).
//
// Mirrors the pattern in notificationsBus.ts so consumers feel familiar.

type Listener = () => void;
const listeners = new Set<Listener>();

export function openChat() {
  for (const l of listeners) l();
}

export function subscribeChat(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
