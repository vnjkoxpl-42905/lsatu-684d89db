type Listener = () => void;
const listeners = new Set<Listener>();

export function openTAWidget() {
  for (const l of listeners) l();
}

export function subscribeTAWidget(cb: Listener) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
